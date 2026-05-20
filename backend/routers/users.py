"""
routers/users.py — /api/users/*
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import text

from core.database import engine
from core.database import IS_MYSQL
from core.auth import (
    security, _hash, _require_admin,
    ROLES_VALIDES, DEFAULT_DIR_PASSWORD,
)

router = APIRouter(tags=["users"])


# ── Pydantic models ───────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username:      str
    password:      str
    role:          str
    nom_complet:   str = ""
    etablissement: str = ""


class UserUpdate(BaseModel):
    password:      str = ""
    role:          str = ""
    nom_complet:   str = ""
    actif:         int = 1
    etablissement: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/api/users")
def list_users(creds: HTTPAuthorizationCredentials = Depends(security)):
    _require_admin(creds)
    if not engine:
        raise HTTPException(503, "DB non disponible")
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT username, role, nom_complet, actif, created_at, etablissement, password_plain "
            "FROM users ORDER BY role, username"
        )).fetchall()
    return [
        {"username": r[0], "role": r[1], "nom_complet": r[2], "actif": r[3],
         "created_at": r[4], "etablissement": r[5] or "", "password_plain": r[6] or ""}
        for r in rows
    ]


@router.post("/api/users")
def create_user(body: UserCreate, creds: HTTPAuthorizationCredentials = Depends(security)):
    _require_admin(creds)
    if body.role not in ROLES_VALIDES:
        raise HTTPException(400, f"Rôle invalide : {body.role}")
    if not engine:
        raise HTTPException(503, "DB non disponible")
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    try:
        with engine.connect() as conn:
            existing = conn.execute(
                text("SELECT username FROM users WHERE username=:u"), {"u": body.username}
            ).fetchone()
            if existing:
                raise HTTPException(409, "Utilisateur déjà existant")
            conn.execute(text(
                "INSERT INTO users (username, password, role, nom_complet, actif, created_at, etablissement, password_plain) "
                "VALUES (:u,:p,:r,:n,1,:at,:e,:pp)"
            ), {"u": body.username, "p": _hash(body.password), "r": body.role,
                "n": body.nom_complet, "at": now, "e": body.etablissement, "pp": body.password})
            conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"success": True, "username": body.username}


@router.patch("/api/users/{username}")
def update_user(
    username: str,
    body: UserUpdate,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    _require_admin(creds)
    if not engine:
        raise HTTPException(503, "DB non disponible")
    with engine.connect() as conn:
        if body.password:
            conn.execute(
                text("UPDATE users SET password=:p, password_plain=:pp WHERE username=:u"),
                {"p": _hash(body.password), "pp": body.password, "u": username},
            )
        if body.role and body.role in ROLES_VALIDES:
            conn.execute(
                text("UPDATE users SET role=:r WHERE username=:u"),
                {"r": body.role, "u": username},
            )
        if body.nom_complet:
            conn.execute(
                text("UPDATE users SET nom_complet=:n WHERE username=:u"),
                {"n": body.nom_complet, "u": username},
            )
        conn.execute(
            text("UPDATE users SET actif=:a, etablissement=:e WHERE username=:u"),
            {"a": body.actif, "e": body.etablissement, "u": username},
        )
        conn.commit()
    return {"success": True}


@router.delete("/api/users/{username}")
def delete_user(username: str, creds: HTTPAuthorizationCredentials = Depends(security)):
    _require_admin(creds)
    if username == "admin":
        raise HTTPException(400, "Impossible de supprimer le compte admin principal")
    if not engine:
        raise HTTPException(503, "DB non disponible")
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM users WHERE username=:u"), {"u": username})
        conn.commit()
    return {"success": True}


@router.post("/api/users/seed-directors")
def seed_director_accounts(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Crée un compte de connexion pour chaque Chef de service de la table personnel."""
    _require_admin(creds)
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        with engine.connect() as conn:
            chefs = conn.execute(text("""
                SELECT matricule, nom_complet, etablissement, telephone, email
                FROM personnel
                WHERE role = 'Chef de service'
                GROUP BY etablissement
                ORDER BY etablissement
            """)).fetchall()

            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            created, updated, skipped = [], [], []

            for chef in chefs:
                matricule, nom_complet, etablissement, telephone, email = chef
                nom_complet = (nom_complet or "").strip()

                import unicodedata
                def normalize(s):
                    return ''.join(
                        c for c in unicodedata.normalize('NFD', s)
                        if unicodedata.category(c) != 'Mn'
                    )

                parts = nom_complet.split()
                if len(parts) >= 2:
                    prenom_init = (
                        parts[0][0].lower()
                        if parts[0] not in ('Dr.', 'Pr.', 'M.', 'Mme')
                        else (parts[1][0].lower() if len(parts) > 1 else 'x')
                    )
                    nom_famille  = parts[-1].lower()
                    base_username = normalize(prenom_init + '.' + nom_famille)
                else:
                    base_username = normalize(nom_complet.lower().replace(' ', '_'))

                hashed_pwd = _hash(DEFAULT_DIR_PASSWORD)

                existing_etab = conn.execute(
                    text("SELECT username FROM users WHERE role='directeur' AND etablissement=:e"),
                    {"e": etablissement},
                ).fetchone()

                if existing_etab:
                    username = existing_etab[0]
                    conn.execute(text(
                        "UPDATE users SET password=:p, password_plain=:pp, nom_complet=:n, actif=1 WHERE username=:u"
                    ), {"p": hashed_pwd, "pp": DEFAULT_DIR_PASSWORD, "n": nom_complet, "u": username})
                    updated.append({
                        "username":      username,
                        "mot_de_passe":  DEFAULT_DIR_PASSWORD,
                        "nom_complet":   nom_complet,
                        "etablissement": etablissement,
                    })
                else:
                    username = base_username
                    suffix   = 2
                    while conn.execute(text("SELECT 1 FROM users WHERE username=:u"), {"u": username}).fetchone():
                        username = f"{base_username}{suffix}"
                        suffix  += 1

                    conn.execute(text("""
                        INSERT INTO users (username, password, password_plain, role, nom_complet, actif, created_at, etablissement)
                        VALUES (:u, :p, :pp, 'directeur', :n, 1, :at, :e)
                    """), {"u": username, "p": hashed_pwd, "pp": DEFAULT_DIR_PASSWORD,
                           "n": nom_complet, "at": now, "e": etablissement})
                    created.append({
                        "username":      username,
                        "mot_de_passe":  DEFAULT_DIR_PASSWORD,
                        "nom_complet":   nom_complet,
                        "etablissement": etablissement,
                    })

            conn.commit()

        return {
            "created":             created,
            "updated":             updated,
            "skipped":             skipped,
            "total_created":       len(created),
            "total_updated":       len(updated),
            "mot_de_passe_defaut": DEFAULT_DIR_PASSWORD,
        }
    except Exception as e:
        raise HTTPException(500, str(e))
