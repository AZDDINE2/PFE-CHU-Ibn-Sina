"""
routers/auth.py — /api/auth/login, logout, me, refresh
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel

from core.auth import (
    security, _hash, _get_user_from_db,
    create_jwt, decode_jwt, JWT_EXPIRE,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginInput(BaseModel):
    username: str
    password: str


@router.post("/login")
def login_v2(body: LoginInput):
    hashed = _hash(body.password)
    u = _get_user_from_db(body.username)
    if not u or u["password"] != hashed:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if isinstance(u.get("actif"), int) and u["actif"] == 0:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    etab = u.get("etablissement", "")
    token = create_jwt(body.username, u["role"], etab)
    return {"token": token, "username": body.username, "role": u["role"], "etablissement": etab}


@router.post("/logout")
def logout():
    # JWT est stateless — le client supprime simplement le token
    return {"message": "Deconnecte"}


@router.get("/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifie")
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expire")
    return {"username": payload.get("sub"), "role": payload.get("role")}


@router.post("/refresh")
def refresh(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Renouvelle le JWT si encore valide."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifie")
    payload = decode_jwt(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expire")
    username = payload.get("sub")
    role = payload.get("role")
    new_token = create_jwt(username, role)
    return {"token": new_token, "username": username, "role": role, "expires_in": JWT_EXPIRE * 60}
