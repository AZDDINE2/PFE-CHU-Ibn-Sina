"""
routers/ressources.py — /api/ressources, /api/personnel/*, /api/lits/*
"""
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import text

from core.database import engine, data
from core.auth import security, _etab_from_creds
from core.data_loader import get_urg

router = APIRouter(tags=["ressources"])


# ── Modèles Pydantic ──────────────────────────────────────────────────────────
class PersonnelUpdate(BaseModel):
    statut: str


class LitUpdate(BaseModel):
    statut:      str
    id_patient:  str = ""
    nom_patient: str = ""


# ── Ressources globales ───────────────────────────────────────────────────────
@router.get("/api/ressources")
def get_ressources():
    try:
        urg  = get_urg().copy()
        etab = data.get("etab", pd.DataFrame())

        etab_lookup: dict = {}
        if not etab.empty and "nom" in etab.columns:
            for _, row in etab.iterrows():
                etab_lookup[row["nom"]] = {
                    "medecins":   int(row.get("nb_medecins",   20)),
                    "infirmiers": int(row.get("nb_urgentistes", 40)),
                    "lits_total": int(row.get("capacite_lits",  50)),
                }

        FALLBACK = {
            "CHU Ibn Sina":    {"medecins": 60, "infirmiers": 120, "lits_total": 200},
            "Hopital Ibn Sina":{"medecins": 45, "infirmiers":  90, "lits_total": 120},
            "Hopital des Enfants": {"medecins": 25, "infirmiers": 50, "lits_total": 60},
            "Hopital Al Ayachi":   {"medecins": 30, "infirmiers": 60, "lits_total": 80},
            "Hopital Ar-Razi":     {"medecins": 20, "infirmiers": 40, "lits_total": 50},
            "Hopital des Specialites": {"medecins": 35, "infirmiers": 70, "lits_total": 100},
            "Hopital de Maternite et de Sante Reproductrice les Orangers": {"medecins": 25, "infirmiers": 50, "lits_total": 80},
            "Hopital Moulay Youssef": {"medecins": 20, "infirmiers": 40, "lits_total": 60},
            "Hopital de Maternite Souissi": {"medecins": 20, "infirmiers": 40, "lits_total": 60},
        }

        results = []
        etablissements = urg["Etablissement"].dropna().unique() if "Etablissement" in urg.columns else []

        for etab_nom in etablissements:
            grp    = urg[urg["Etablissement"] == etab_nom]
            ressrc = etab_lookup.get(str(etab_nom)) or FALLBACK.get(str(etab_nom)) or {"medecins": 20, "infirmiers": 40, "lits_total": 50}

            recents      = grp[grp["Date_Arrivee"] >= pd.Timestamp.now() - pd.Timedelta(days=30)]
            lits_occupes = int((recents["Orientation"] == "Hospitalise").sum()) if len(recents) > 0 else 0
            lits_occupes = min(lits_occupes, ressrc["lits_total"])
            lits_dispo   = ressrc["lits_total"] - lits_occupes
            taux_occup   = round(lits_occupes / ressrc["lits_total"] * 100, 1) if ressrc["lits_total"] > 0 else 0
            charge       = "Critique" if taux_occup >= 80 else "Élevée" if taux_occup >= 60 else "Normale"

            results.append({
                "etablissement":   str(etab_nom),
                "medecins":        ressrc["medecins"],
                "infirmiers":      ressrc["infirmiers"],
                "lits_total":      ressrc["lits_total"],
                "lits_occupes":    lits_occupes,
                "lits_dispo":      lits_dispo,
                "taux_occupation": taux_occup,
                "charge":          charge,
                "total_patients":  int(len(grp)),
            })

        results.sort(key=lambda x: x["taux_occupation"], reverse=True)
        return results
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Personnel ─────────────────────────────────────────────────────────────────
@router.get("/api/personnel")
def get_personnel(
    etablissement: str = "",
    role: str = "",
    statut: str = "",
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Liste du personnel avec filtres optionnels."""
    etab_user = _etab_from_creds(creds)
    if etab_user and not etablissement:
        etablissement = etab_user
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        q = "SELECT * FROM personnel WHERE 1=1"
        params: dict = {}
        if etablissement:
            q += " AND etablissement = :etab"; params["etab"] = etablissement
        if role:
            q += " AND role = :role"; params["role"] = role
        if statut:
            q += " AND statut = :statut"; params["statut"] = statut
        q += " ORDER BY etablissement, role, nom_complet"
        with engine.connect() as conn:
            rows = conn.execute(text(q), params).fetchall()
            cols = ["id", "matricule", "etablissement", "nom_complet", "sexe", "role",
                    "specialite", "statut", "telephone", "email", "date_embauche", "updated_at"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/personnel/directeurs")
def get_directeurs():
    """Retourne un directeur (Chef de service) par établissement."""
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT etablissement, matricule, nom_complet, sexe, role,
                       specialite, statut, telephone, email, date_embauche
                FROM personnel
                WHERE role = 'Chef de service'
                GROUP BY etablissement
                ORDER BY etablissement
            """)).fetchall()
        cols = ["etablissement", "matricule", "nom_complet", "sexe", "role",
                "specialite", "statut", "telephone", "email", "date_embauche"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/personnel/stats")
def get_personnel_stats(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Statistiques RH par établissement."""
    if not engine:
        raise HTTPException(503, "DB non disponible")
    etab_user = _etab_from_creds(creds)
    try:
        with engine.connect() as conn:
            q = """
                SELECT etablissement,
                       COUNT(*) as total,
                       SUM(CASE WHEN role LIKE '%edecin%' OR role LIKE '%nterne%' THEN 1 ELSE 0 END) as medecins,
                       SUM(CASE WHEN role LIKE '%nfirmier%' OR role LIKE '%ide%' THEN 1 ELSE 0 END) as infirmiers,
                       SUM(CASE WHEN statut='En service' OR statut='En garde' THEN 1 ELSE 0 END) as en_service,
                       SUM(CASE WHEN statut='En conge' OR statut='Repos' THEN 1 ELSE 0 END) as absent
                FROM personnel
            """
            params: dict = {}
            if etab_user:
                q += " WHERE etablissement = :etab"; params["etab"] = etab_user
            q += " GROUP BY etablissement ORDER BY total DESC"
            rows = conn.execute(text(q), params).fetchall()
        cols = ["etablissement", "total", "medecins", "infirmiers", "en_service", "absent"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/personnel/{matricule}")
def update_personnel_statut(
    matricule: str,
    body: PersonnelUpdate,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Met à jour le statut d'un membre du personnel."""
    STATUTS_OK = ["En service", "En garde", "En conge", "Repos"]
    if body.statut not in STATUTS_OK:
        raise HTTPException(400, f"Statut invalide : {STATUTS_OK}")
    if not engine:
        raise HTTPException(503, "DB non disponible")
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE personnel SET statut=:s, updated_at=:u WHERE matricule=:m"),
            {"s": body.statut, "u": now, "m": matricule},
        )
        conn.commit()
    return {"success": True}


# ── Lits ──────────────────────────────────────────────────────────────────────
@router.get("/api/lits")
def get_lits(
    etablissement: str = "",
    service: str = "",
    statut: str = "",
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Liste des lits avec filtres optionnels."""
    etab_user = _etab_from_creds(creds)
    if etab_user and not etablissement:
        etablissement = etab_user
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        q = "SELECT * FROM lits WHERE 1=1"
        params: dict = {}
        if etablissement:
            q += " AND etablissement = :etab"; params["etab"] = etablissement
        if service:
            q += " AND service = :service"; params["service"] = service
        if statut:
            q += " AND statut = :statut"; params["statut"] = statut
        q += " ORDER BY etablissement, service, numero_lit"
        with engine.connect() as conn:
            rows = conn.execute(text(q), params).fetchall()
        cols = ["id", "etablissement", "numero_lit", "service", "type_lit", "statut",
                "id_patient", "nom_patient", "date_admission", "updated_at"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/lits/stats")
def get_lits_stats(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Statistiques des lits par établissement."""
    if not engine:
        raise HTTPException(503, "DB non disponible")
    etab_user = _etab_from_creds(creds)
    try:
        with engine.connect() as conn:
            q = """
                SELECT etablissement,
                       COUNT(*) as total,
                       SUM(CASE WHEN statut='Disponible' THEN 1 ELSE 0 END) as disponibles,
                       SUM(CASE WHEN statut='Occupe' THEN 1 ELSE 0 END) as occupes,
                       SUM(CASE WHEN statut='En maintenance' THEN 1 ELSE 0 END) as maintenance,
                       ROUND(SUM(CASE WHEN statut='Occupe' THEN 1.0 ELSE 0 END)*100/COUNT(*),1) as taux_occupation
                FROM lits
            """
            params: dict = {}
            if etab_user:
                q += " WHERE etablissement = :etab"; params["etab"] = etab_user
            q += " GROUP BY etablissement ORDER BY taux_occupation DESC"
            rows = conn.execute(text(q), params).fetchall()
        cols = ["etablissement", "total", "disponibles", "occupes", "maintenance", "taux_occupation"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/lits/recommander")
def recommander_lits(
    service: str = "",
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Retourne les établissements avec lits disponibles, triés par disponibilité."""
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        with engine.connect() as conn:
            q = """
                SELECT etablissement, service,
                       COUNT(*) as total,
                       SUM(CASE WHEN statut='Disponible' THEN 1 ELSE 0 END) as disponibles,
                       ROUND(SUM(CASE WHEN statut='Occupe' THEN 1.0 ELSE 0 END)*100/COUNT(*), 1) as taux_occupation
                FROM lits WHERE 1=1
            """
            params: dict = {}
            if service:
                q += " AND LOWER(service) LIKE :svc"; params["svc"] = f"%{service.lower()}%"
            q += " GROUP BY etablissement, service HAVING disponibles > 0 ORDER BY disponibles DESC"
            rows = conn.execute(text(q), params).fetchall()
        cols = ["etablissement", "service", "total", "disponibles", "taux_occupation"]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/lits/disponibles")
def get_lits_disponibles(etablissement: str = ""):
    """Retourne la liste des lits disponibles depuis la table lits."""
    if not engine:
        raise HTTPException(503, "DB non disponible")
    try:
        params: dict = {}
        if etablissement:
            q  = "SELECT numero_lit FROM lits WHERE statut='Disponible' AND etablissement=:e ORDER BY service, numero_lit"
            params["e"] = etablissement
        else:
            q  = "SELECT numero_lit FROM lits WHERE statut='Disponible' ORDER BY etablissement, service, numero_lit"
        with engine.connect() as conn:
            disponibles = [r[0] for r in conn.execute(text(q), params).fetchall()]
            q2 = "SELECT numero_lit FROM lits WHERE statut='Occupe'"
            if etablissement:
                q2 += " AND etablissement=:e"
            occupes = [r[0] for r in conn.execute(text(q2), params).fetchall()]
            q3      = "SELECT COUNT(*) FROM lits" + (" WHERE etablissement=:e" if etablissement else "")
            total   = conn.execute(text(q3), params).scalar()
        return {
            "disponibles": disponibles,
            "occupes":     occupes,
            "total":       total,
            "nb_dispo":    len(disponibles),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/lits/{etablissement}/{numero_lit}")
def update_lit(
    etablissement: str,
    numero_lit: str,
    body: LitUpdate,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Met à jour le statut d'un lit (Disponible/Occupé/En maintenance)."""
    STATUTS_OK = ["Disponible", "Occupe", "En maintenance", "Reserve"]
    if body.statut not in STATUTS_OK:
        raise HTTPException(400, f"Statut invalide : {STATUTS_OK}")
    if not engine:
        raise HTTPException(503, "DB non disponible")
    now      = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    date_adm = now if body.statut == "Occupe" else ""
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE lits SET statut=:s, id_patient=:ip, nom_patient=:np,
                           date_admission=:da, updated_at=:u
            WHERE etablissement=:e AND numero_lit=:n
        """), {"s": body.statut, "ip": body.id_patient, "np": body.nom_patient,
               "da": date_adm, "u": now, "e": etablissement, "n": numero_lit})
        conn.commit()
    return {"success": True}
