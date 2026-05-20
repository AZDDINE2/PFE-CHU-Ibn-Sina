"""
core/auth.py — JWT, hachage, vérification token, init table users.
"""
import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text

from core.database import engine, IS_MYSQL

try:
    import jwt as pyjwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

# ── Configuration JWT ─────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "chu_ibn_sina_secret_2025_pfe")
JWT_ALGO   = "HS256"
JWT_EXPIRE = int(os.environ.get("JWT_EXPIRE_MINUTES", 480))

security = HTTPBearer(auto_error=False)

# ── Utilisateurs par défaut (fallback si DB KO) ───────────────────────────────
def _hash(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

USERS = {
    "admin":        {"password": _hash("admin123"), "role": "admin"},
    "chef_medecin": {"password": _hash("admin123"), "role": "chef_medecin"},
    "urgentiste":   {"password": _hash("admin123"), "role": "urgentiste"},
    "infirmier":    {"password": _hash("admin123"), "role": "infirmier"},
    "directeur":    {"password": _hash("admin123"), "role": "directeur"},
    "analyste":     {"password": _hash("admin123"), "role": "analyste"},
    "admin_si":     {"password": _hash("admin123"), "role": "admin_si"},
}

ROLES_VALIDES = ["admin", "chef_medecin", "urgentiste", "infirmier", "directeur", "analyste", "admin_si"]
DEFAULT_DIR_PASSWORD = "DirecteurCHU2025"


def create_jwt(username: str, role: str, etablissement: str = "") -> str:
    if JWT_AVAILABLE:
        payload = {
            "sub":           username,
            "role":          role,
            "etablissement": etablissement,
            "exp":           datetime.utcnow() + timedelta(minutes=JWT_EXPIRE),
            "iat":           datetime.utcnow(),
        }
        return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
    else:
        import secrets as _s
        return _s.token_hex(32)


def decode_jwt(token: str) -> Optional[dict]:
    if JWT_AVAILABLE:
        try:
            return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        except Exception:
            return None
    return None


def verify_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """Vérifie le token JWT et retourne le payload, lève 401 sinon."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifie")
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expire")
    return payload


def _etab_from_creds(creds: HTTPAuthorizationCredentials) -> str:
    """Retourne l'établissement du user connecté ('' = pas de filtre)."""
    payload = decode_jwt(creds.credentials) if creds else None
    if not payload:
        return ""
    return payload.get("etablissement", "") or ""


def _require_admin(creds: HTTPAuthorizationCredentials):
    payload = decode_jwt(creds.credentials) if creds else None
    if not payload or payload.get("role") != "admin":
        raise HTTPException(403, "Accès réservé à l'administrateur")
    return payload


def _get_user_from_db(username: str):
    """Récupère un utilisateur depuis la DB (fallback sur USERS dict si DB KO)."""
    if engine:
        try:
            with engine.connect() as conn:
                row = conn.execute(
                    text("SELECT username, password, role, actif, etablissement FROM users WHERE username=:u"),
                    {"u": username}
                ).fetchone()
                if row:
                    return {
                        "username":     row[0],
                        "password":     row[1],
                        "role":         row[2],
                        "actif":        row[3],
                        "etablissement": row[4] or "",
                    }
        except Exception:
            pass
    u = USERS.get(username)
    if u:
        return {**u, "etablissement": ""}
    return None


def _init_users_table():
    """Crée la table users et insère les comptes par défaut si vide."""
    if not engine:
        return
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                username       VARCHAR(255) PRIMARY KEY,
                password       TEXT NOT NULL,
                role           TEXT NOT NULL,
                nom_complet    TEXT DEFAULT '',
                actif          INTEGER DEFAULT 1,
                created_at     TEXT,
                etablissement  TEXT DEFAULT '',
                password_plain TEXT DEFAULT ''
            )
        """))
        for col, definition in [("etablissement", "TEXT DEFAULT ''"), ("password_plain", "TEXT DEFAULT ''")]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {definition}"))
            except Exception:
                pass

        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count == 0:
            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            defaults = [
                ("admin",        _hash("admin123"), "admin",        "Administrateur",        "admin123"),
                ("chef_medecin", _hash("chef123"),  "chef_medecin", "Médecin Chef",           "chef123"),
                ("urgentiste",   _hash("urg123"),   "urgentiste",   "Médecin Urgentiste",     "urg123"),
                ("infirmier",    _hash("inf123"),   "infirmier",    "Cadre Infirmier",        "inf123"),
                ("directeur",    _hash("dir123"),   "directeur",    "Directeur Médical",      "dir123"),
                ("analyste",     _hash("ana123"),   "analyste",     "Data Analyst",           "ana123"),
                ("admin_si",     _hash("si123"),    "admin_si",     "Admin SI",               "si123"),
            ]
            insert_sql = (
                "INSERT IGNORE INTO users (username, password, role, nom_complet, actif, created_at, etablissement, password_plain) VALUES (:u,:p,:r,:n,1,:at,'', :pp)"
                if IS_MYSQL else
                "INSERT OR IGNORE INTO users (username, password, role, nom_complet, actif, created_at, etablissement, password_plain) VALUES (:u,:p,:r,:n,1,:at,'', :pp)"
            )
            for u, p, r, n, pp in defaults:
                conn.execute(text(insert_sql), {"u": u, "p": p, "r": r, "n": n, "at": now, "pp": pp})
        conn.commit()
