"""
routers/patients.py — /api/patients/* (liste, add, aujourd_hui, statut patch)
"""
import os
import sqlite3
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import text

from core.database import engine, IS_MYSQL, DATABASE_URL, data
from core.auth import security, decode_jwt, _etab_from_creds
from core.data_loader import get_urg, reload_urg

router = APIRouter(tags=["patients"])


# ── Modèles Pydantic ──────────────────────────────────────────────────────────
class AdmissionBody(BaseModel):
    nom_complet: str
    cin: str = ''
    age: int
    sexe: str
    groupe_sanguin: str
    antecedents: str
    etablissement: str
    niveau_triage: str
    motif_consultation: str
    orientation: str
    duree_sejour_min: int
    nb_medecins_dispo: int = 5
    nb_lits_dispo: int = 10
    date_arrivee: Optional[str] = None
    mutuelle: str = 'Payant'
    prix_sejour: float = 0.0
    prix_soins: float = 0.0


class StatutUpdate(BaseModel):
    statut:     str   # "En triage" | "En attente" | "En traitement" | "Sorti"
    lit_numero: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/api/patients/liste")
def get_patients_liste():
    """Vue patient : une ligne par patient avec tout son historique."""
    try:
        urg = get_urg().copy()
        urg = urg.sort_values("Date_Arrivee", ascending=False).head(30000)

        TRIAGE_ORDER = {"P1 - Critique": 1, "P2 - Urgent": 2, "P3 - Semi-urgent": 3, "P4 - Non urgent": 4}

        results = []
        for nom, grp in urg.groupby("Nom_Complet", sort=False):
            grp = grp.sort_values("Date_Arrivee", ascending=False)
            derniere = grp.iloc[0]
            niveaux  = grp["Niveau_Triage"].dropna().tolist()
            pire     = min(niveaux, key=lambda x: TRIAGE_ORDER.get(x, 99)) if niveaux else ""
            historique = []
            for _, row in grp.iterrows():
                historique.append({
                    "id_passage":    str(row.get("IPP", "")),
                    "date":          str(row["Date_Arrivee"])[:10] if pd.notna(row["Date_Arrivee"]) else "",
                    "niveau_triage": str(row.get("Niveau_Triage", "")),
                    "motif":         str(row.get("Motif_Consultation", "")),
                    "orientation":   str(row.get("Orientation", "")),
                    "duree_min":     int(row["Duree_Sejour_min"]) if pd.notna(row.get("Duree_Sejour_min")) else 0,
                    "etablissement": str(row.get("Etablissement", "")),
                    "mutuelle":      str(row.get("Mutuelle", "Payant")),
                    "prix_sejour":   float(row["Prix_Sejour"]) if pd.notna(row.get("Prix_Sejour")) else 0.0,
                    "prix_soins":    float(row["Prix_Soins"])  if pd.notna(row.get("Prix_Soins"))  else 0.0,
                })
            total_sejour = float(grp["Prix_Sejour"].sum()) if "Prix_Sejour" in grp.columns else 0.0
            total_soins  = float(grp["Prix_Soins"].sum())  if "Prix_Soins"  in grp.columns else 0.0
            results.append({
                "nom_complet":     nom,
                "age":             int(derniere["Age"]) if pd.notna(derniere.get("Age")) else 0,
                "sexe":            str(derniere.get("Sexe", "")),
                "cin":             str(derniere.get("CIN", "")),
                "groupe_sanguin":  str(derniere.get("Groupe_Sanguin", "")),
                "antecedents":     str(derniere.get("Antecedents", "")),
                "mutuelle":        str(derniere.get("Mutuelle", "Payant")),
                "total_sejour":    total_sejour,
                "total_soins":     total_soins,
                "nb_visites":      len(grp),
                "derniere_visite": str(derniere["Date_Arrivee"])[:10] if pd.notna(derniere["Date_Arrivee"]) else "",
                "triage_max":      pire,
                "historique":      historique,
            })
        results.sort(key=lambda x: x["derniere_visite"], reverse=True)
        return results
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/patients/add")
def add_patient(body: AdmissionBody, creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        import traceback
        df = get_urg()

        try:
            dt  = pd.to_datetime(body.date_arrivee) if body.date_arrivee else pd.Timestamp.now()
            now = pd.Timestamp.now()
            if dt > now or (now - dt).total_seconds() > 86400:
                dt = now
        except Exception:
            dt = pd.Timestamp.now()

        date_sortie = dt + pd.Timedelta(minutes=body.duree_sejour_min)

        try:
            with engine.connect() as conn:
                val = conn.execute(text('SELECT MAX(IPP) FROM urgences')).scalar()
            max_id_urg = int(val or 0) + 1
        except Exception:
            max_id_urg = int(df.shape[0]) + 1
        try:
            max_id_pat = max_id_urg
        except Exception:
            max_id_pat = int(df.shape[0]) + 1

        SAISONS  = {12:"Hiver",1:"Hiver",2:"Hiver",3:"Printemps",4:"Printemps",5:"Printemps",
                    6:"Ete",7:"Ete",8:"Ete",9:"Automne",10:"Automne",11:"Automne"}
        JOURS_FR = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]
        TRANCHES = {0:"Nuit",1:"Nuit",2:"Nuit",3:"Nuit",4:"Nuit",5:"Nuit",
                    6:"Matin",7:"Matin",8:"Matin",9:"Matin",10:"Matin",11:"Matin",
                    12:"Apres-midi",13:"Apres-midi",14:"Apres-midi",15:"Apres-midi",16:"Apres-midi",17:"Apres-midi",
                    18:"Soir",19:"Soir",20:"Soir",21:"Soir",22:"Soir",23:"Soir"}
        age = body.age
        groupe_age = "Enfant" if age < 15 else "Adulte jeune" if age < 30 else "Adulte" if age < 60 else "Senior"

        new_row = {
            "IPP":                max_id_urg,
            "Nom_Complet":        body.nom_complet,
            "CIN":                body.cin,
            "Age":                body.age,
            "Sexe":               body.sexe,
            "Groupe_Sanguin":     body.groupe_sanguin,
            "Antecedents":        body.antecedents,
            "Etablissement":      body.etablissement,
            "Type_Etab":          "CHU",
            "Ville":              "Rabat",
            "Date_Arrivee":       dt.strftime("%Y-%m-%d %H:%M:%S"),
            "Date_Sortie":        date_sortie.strftime("%Y-%m-%d %H:%M:%S"),
            "Niveau_Triage":      body.niveau_triage,
            "Motif_Consultation": body.motif_consultation,
            "Orientation":        body.orientation,
            "Duree_Sejour_min":   body.duree_sejour_min,
            "Nb_Medecins_Dispo":  body.nb_medecins_dispo,
            "Nb_Lits_Dispo":      body.nb_lits_dispo,
            "Jour_Ferie":         0,
            "Saison":             SAISONS[dt.month],
            "Heure_Arrivee":      dt.hour,
            "Jour_Semaine":       dt.weekday(),
            "Mois":               dt.month,
            "Annee":              dt.year,
            "Tranche_Horaire":    TRANCHES[dt.hour],
            "Nom_Jour":           JOURS_FR[dt.weekday()],
            "Groupe_Age":         groupe_age,
            "Est_Pic":            1 if dt.hour in range(8, 20) else 0,
            "Mutuelle":           body.mutuelle,
            "Prix_Sejour":        body.prix_sejour,
            "Prix_Soins":         body.prix_soins,
        }

        cols = list(new_row.keys())
        vals = [new_row[c] for c in cols]
        placeholders = ",".join(["?" for _ in cols])
        col_names    = ",".join([f'"{c}"' for c in cols])

        if DATABASE_URL.startswith("sqlite"):
            db_path = DATABASE_URL.replace("sqlite:////", "/").replace("sqlite:///", "")
            conn_insert = sqlite3.connect(db_path, timeout=60)
            conn_insert.execute("PRAGMA journal_mode=WAL")
            conn_insert.execute(
                f'INSERT INTO urgences ({col_names}) VALUES ({placeholders})',
                vals
            )
            conn_insert.commit()
            conn_insert.execute("PRAGMA wal_checkpoint(FULL)")
            conn_insert.close()
        elif engine:
            new_df = pd.DataFrame([new_row])
            new_df["Date_Arrivee"] = pd.to_datetime(new_df["Date_Arrivee"])
            new_df["Date_Sortie"]  = pd.to_datetime(new_df["Date_Sortie"])
            new_df.to_sql("urgences", engine, if_exists="append", index=False)

        reload_urg()
        return {"success": True, "IPP": new_row["IPP"]}
    except Exception as e:
        import traceback
        print("ADMISSION ERROR:", traceback.format_exc())
        raise HTTPException(500, str(e))


@router.get("/api/patients/aujourd_hui")
def get_patients_aujourd_hui(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Retourne les patients admis aujourd'hui avec leur statut en temps réel."""
    try:
        urg    = get_urg()
        cutoff = pd.Timestamp.now() - pd.Timedelta(hours=24)
        df     = urg[urg["Date_Arrivee"] >= cutoff].copy()
        etab_user = _etab_from_creds(creds)
        if etab_user and "Etablissement" in df.columns:
            df = df[df["Etablissement"] == etab_user]
        df = df.sort_values("Date_Arrivee", ascending=False)

        statuts: dict = {}
        if engine:
            try:
                with engine.connect() as conn:
                    rows = conn.execute(text(
                        "SELECT IPP, statut, lit_numero, updated_at, updated_by FROM patient_statuts"
                    )).fetchall()
                    for r in rows:
                        statuts[str(r[0])] = {
                            "statut":     r[1],
                            "lit_numero": r[2] or "",
                            "updated_at": r[3],
                            "updated_by": r[4],
                        }
            except Exception:
                pass

        results = []
        for _, row in df.iterrows():
            id_urg  = str(row.get("IPP", ""))
            st_info = statuts.get(id_urg, {})
            results.append({
                "IPP":           id_urg,
                "nom_complet":   row.get("Nom_Complet", ""),
                "age":           row.get("Age", 0),
                "sexe":          row.get("Sexe", ""),
                "cin":           row.get("CIN", ""),
                "niveau_triage": row.get("Niveau_Triage", ""),
                "motif":         row.get("Motif_Consultation", ""),
                "etablissement": row.get("Etablissement", ""),
                "heure_arrivee": row["Date_Arrivee"].strftime("%H:%M") if pd.notna(row["Date_Arrivee"]) else "",
                "statut":        st_info.get("statut", "En triage"),
                "lit_numero":    st_info.get("lit_numero", ""),
                "updated_at":    st_info.get("updated_at", ""),
                "updated_by":    st_info.get("updated_by", ""),
            })
        return results
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/api/patients/{IPP}/statut")
def update_statut(
    IPP: str,
    body: StatutUpdate,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """Met à jour le statut et/ou le lit d'un patient en temps réel."""
    STATUTS_VALIDES = ["En triage", "En attente", "En traitement", "Sorti"]
    if body.statut not in STATUTS_VALIDES:
        raise HTTPException(400, f"Statut invalide. Valeurs acceptées : {STATUTS_VALIDES}")
    if not engine:
        raise HTTPException(503, "Base de données non disponible")
    try:
        payload  = decode_jwt(creds.credentials) if creds else None
        username = payload.get("sub", "inconnu") if payload else "inconnu"
        now      = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS patient_statuts (
                    IPP VARCHAR(50) PRIMARY KEY,
                    statut     TEXT NOT NULL,
                    lit_numero TEXT DEFAULT '',
                    updated_at TEXT,
                    updated_by TEXT
                )
            """))
            if IS_MYSQL:
                conn.execute(text("""
                    INSERT INTO patient_statuts (IPP, statut, lit_numero, updated_at, updated_by)
                    VALUES (:id, :st, :lit, :at, :by)
                    ON DUPLICATE KEY UPDATE
                        statut=VALUES(statut), lit_numero=VALUES(lit_numero),
                        updated_at=VALUES(updated_at), updated_by=VALUES(updated_by)
                """), {"id": IPP, "st": body.statut, "lit": body.lit_numero, "at": now, "by": username})
            else:
                conn.execute(text("""
                    INSERT INTO patient_statuts (IPP, statut, lit_numero, updated_at, updated_by)
                    VALUES (:id, :st, :lit, :at, :by)
                    ON CONFLICT(IPP) DO UPDATE SET
                        statut=excluded.statut, lit_numero=excluded.lit_numero,
                        updated_at=excluded.updated_at, updated_by=excluded.updated_by
                """), {"id": IPP, "st": body.statut, "lit": body.lit_numero, "at": now, "by": username})
            conn.commit()
        return {"success": True, "IPP": IPP, "statut": body.statut, "lit_numero": body.lit_numero}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
