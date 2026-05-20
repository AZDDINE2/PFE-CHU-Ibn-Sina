"""
routers/predictions.py — /api/predictions, /api/simulateur, /api/predict/triage,
                          /api/predictions/planification, /api/anomalies,
                          /api/modeles/metriques
"""
import math
import os
from datetime import date as date_type
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import text

from core.database import engine, data, MODELS
from core.auth import security, _etab_from_creds
from core.data_loader import get_urg

router = APIRouter(tags=["predictions"])


def df_to_records(df):
    return [
        {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v)) else
             round(v, 2) if isinstance(v, float) else v)
         for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


# ── Pydantic models ───────────────────────────────────────────────────────────
class SimulateurInput(BaseModel):
    mois: int
    heure: int
    jour_semaine: int
    jour_ferie: int
    saison: str


class TriageInput(BaseModel):
    age: int
    sexe: str           # "M" ou "F"
    heure: int          # 0-23
    jour_semaine: int   # 0=Lundi ... 6=Dimanche
    mois: int           # 1-12
    saison: str         # "Hiver","Printemps","Été","Automne"
    jour_ferie: bool = False
    antecedents: str = "Aucun"


# ── Constantes ────────────────────────────────────────────────────────────────
SAISON_MAP    = {"Hiver": 0, "Printemps": 1, "Eté": 2, "Été": 2, "Ete": 2, "Automne": 3}
SEXE_MAP      = {"M": 1, "F": 0}
TRIAGE_LABELS = {1: "P1 - Critique", 2: "P2 - Urgent", 3: "P3 - Semi-urgent", 4: "P4 - Non urgent"}
TRIAGE_COLORS = {1: "#EF4444", 2: "#F59E0B", 3: "#3B82F6", 4: "#22C55E"}
TRIAGE_RISK   = {1: "Critique", 2: "Élevé", 3: "Modéré", 4: "Faible"}


def has_antecedent(ants: str, keyword: str) -> int:
    return int(keyword.lower() in ants.lower())


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/api/predictions")
def get_predictions():
    try:
        if not data["pred30"].empty:
            return df_to_records(data["pred30"])
        urg   = get_urg()
        daily = urg.groupby(urg["Date_Arrivee"].dt.date).size().reset_index()
        daily.columns = ["ds", "y"]
        daily["ds"]   = pd.to_datetime(daily["ds"])
        avg       = daily["y"].mean()
        std       = daily["y"].std()
        last_date = daily["ds"].max()
        future    = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=30)
        pred = pd.DataFrame({
            "ds":          future.strftime("%Y-%m-%d"),
            "yhat":        np.round(np.random.normal(avg, std * 0.3, 30).clip(min=1)).astype(int),
            "yhat_lower":  np.round((avg - std * 0.5)).astype(int),
            "yhat_upper":  np.round((avg + std * 0.5)).astype(int),
        })
        return df_to_records(pred)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/modeles/metriques")
def get_metriques():
    try:
        df = data.get("metrics")
        if df is None or (hasattr(df, 'empty') and df.empty):
            df = pd.read_csv(os.path.join(MODELS, "metrics_comparison.csv"), encoding="utf-8-sig")
        return [
            {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v))
                 else round(v, 4) if isinstance(v, float) else v)
             for k, v in row.items()}
            for row in df.to_dict(orient="records")
        ]
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/simulateur")
def simulateur(body: SimulateurInput):
    try:
        urg = get_urg()
        xgb = data["xgb"]

        saison_enc  = SAISON_MAP.get(body.saison, 0)
        est_weekend = 1 if body.jour_semaine >= 5 else 0
        trimestre   = (body.mois - 1) // 3 + 1

        nb_medecins  = float(urg["Nb_Medecins_Dispo"].mean())
        nb_lits      = float(urg["Nb_Lits_Dispo"].mean())
        lits_par_med = nb_lits / (nb_medecins + 1)

        triage_enc = 3
        orient_enc = 1
        age_moy    = float(urg["Age"].mean())
        etab_moy   = 3
        groupe_age = 3
        est_pic    = 1 if 8 <= body.heure <= 12 or 17 <= body.heure <= 21 else 0
        annee      = 2024

        heure_sin = np.sin(2 * np.pi * body.heure / 24)
        heure_cos = np.cos(2 * np.pi * body.heure / 24)
        jour_sin  = np.sin(2 * np.pi * body.jour_semaine / 7)
        jour_cos  = np.cos(2 * np.pi * body.jour_semaine / 7)
        mois_sin  = np.sin(2 * np.pi * body.mois / 12)
        mois_cos  = np.cos(2 * np.pi * body.mois / 12)

        X = pd.DataFrame([{
            "Age":                age_moy,
            "sexe_enc":           0,
            "triage_enc":         triage_enc,
            "orientation_enc":    orient_enc,
            "ferie_enc":          body.jour_ferie,
            "weekend":            est_weekend,
            "saison_enc":         saison_enc,
            "etab_enc":           etab_moy,
            "groupe_age_enc":     groupe_age,
            "Heure_Arrivee":      body.heure,
            "Jour_Semaine":       body.jour_semaine,
            "Mois":               body.mois,
            "Annee":              annee,
            "Nb_Medecins_Dispo":  nb_medecins,
            "Nb_Lits_Dispo":      nb_lits,
            "lits_par_med":       lits_par_med,
            "heure_sin":          heure_sin,
            "heure_cos":          heure_cos,
            "jour_sin":           jour_sin,
            "jour_cos":           jour_cos,
            "mois_sin":           mois_sin,
            "mois_cos":           mois_cos,
            "triage_x_age":       triage_enc * age_moy,
            "triage_x_etab":      triage_enc * etab_moy,
            "Est_Pic":            est_pic,
        }])

        pred = float(xgb.predict(X)[0])
        pred = round(max(0, pred), 1)

        if pred < 150:
            niveau   = "FAIBLE"
            couleur  = "#22C55E"
        elif pred < 250:
            niveau   = "MODERE"
            couleur  = "#F59E0B"
        else:
            niveau   = "ELEVE"
            couleur  = "#EF4444"

        return {"prediction": pred, "niveau": niveau, "couleur": couleur}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/predict/triage")
def predict_triage(body: TriageInput):
    try:
        heure_sin  = math.sin(2 * math.pi * body.heure / 24)
        heure_cos  = math.cos(2 * math.pi * body.heure / 24)
        jour_sin   = math.sin(2 * math.pi * body.jour_semaine / 7)
        jour_cos   = math.cos(2 * math.pi * body.jour_semaine / 7)
        mois_sin   = math.sin(2 * math.pi * body.mois / 12)
        mois_cos   = math.cos(2 * math.pi * body.mois / 12)
        saison_n   = SAISON_MAP.get(body.saison, 0)
        sexe_n     = SEXE_MAP.get(body.sexe, 0)
        est_weekend = int(body.jour_semaine >= 5)

        score = 0
        if body.age >= 70 or body.age <= 2: score += 2
        elif body.age >= 60: score += 1
        if body.heure in range(22, 24) or body.heure in range(0, 6): score += 1
        if body.jour_ferie: score += 1
        if has_antecedent(body.antecedents, "cardiaque"):    score += 2
        if has_antecedent(body.antecedents, "diabète"):      score += 1
        if has_antecedent(body.antecedents, "respiratoire"): score += 2
        if has_antecedent(body.antecedents, "neurologique"): score += 2
        if has_antecedent(body.antecedents, "cancer"):       score += 2
        if body.saison == "Hiver": score += 1

        if score >= 5:   triage_num = 1
        elif score >= 3: triage_num = 2
        elif score >= 1: triage_num = 3
        else:            triage_num = 4

        duree_estimee = None
        if "xgb" in data:
            try:
                feat = pd.DataFrame([{
                    "Age": body.age, "Sexe_num": sexe_n,
                    "Triage_num": triage_num, "Orientation_num": 1,
                    "Heure": body.heure, "Jour_Semaine": body.jour_semaine,
                    "Mois": body.mois, "Annee": 2025,
                    "Saison_num": saison_n,
                    "Nb_Medecins_Dispo": 8, "Nb_Lits_Dispo": 30,
                    "Jour_Ferie": int(body.jour_ferie),
                    "Est_Pic": 0, "Est_Weekend": est_weekend,
                    "Heure_sin": heure_sin, "Heure_cos": heure_cos,
                    "Jour_sin": jour_sin, "Jour_cos": jour_cos,
                    "Mois_sin": mois_sin, "Mois_cos": mois_cos,
                    "Triage_Age_inter":   triage_num * body.age,
                    "Triage_Heure_inter": triage_num * body.heure,
                    "Age_sq":             body.age ** 2,
                    "Triage_Weekend":     triage_num * est_weekend,
                }])
                duree_estimee = round(float(data["xgb"].predict(feat)[0]), 0)
            except Exception:
                pass

        BASE_SEJOUR = {1: 4000, 2: 2500, 3: 1200, 4: 500}
        BASE_SOINS  = {1: 3000, 2: 1800, 3: 900,  4: 300}

        prix_sejour = BASE_SEJOUR[triage_num]
        prix_soins  = BASE_SOINS[triage_num]

        if body.heure in range(22, 24) or body.heure in range(0, 6):
            prix_sejour = round(prix_sejour * 1.2)
            prix_soins  = round(prix_soins  * 1.2)
        if body.jour_ferie:
            prix_sejour = round(prix_sejour * 1.15)
            prix_soins  = round(prix_soins  * 1.15)
        if has_antecedent(body.antecedents, "cardiaque") or \
           has_antecedent(body.antecedents, "cancer")    or \
           has_antecedent(body.antecedents, "neurologique"):
            prix_soins = round(prix_soins * 1.4)
        if has_antecedent(body.antecedents, "diabète") or \
           has_antecedent(body.antecedents, "respiratoire"):
            prix_soins = round(prix_soins * 1.2)
        if duree_estimee and duree_estimee > 300:
            prix_sejour = round(prix_sejour * 1.3)
        if body.age >= 70 or body.age <= 2:
            prix_soins = round(prix_soins * 1.15)

        prix_total = prix_sejour + prix_soins

        return {
            "triage":           TRIAGE_LABELS[triage_num],
            "triage_num":       triage_num,
            "color":            TRIAGE_COLORS[triage_num],
            "risque":           TRIAGE_RISK[triage_num],
            "score":            score,
            "duree_estimee_min": duree_estimee,
            "facteurs": {
                "age_risque":         body.age >= 60 or body.age <= 2,
                "heure_nuit":         body.heure in range(22, 24) or body.heure in range(0, 6),
                "jour_ferie":         body.jour_ferie,
                "antecedents_graves": any(
                    has_antecedent(body.antecedents, k)
                    for k in ["cardiaque", "respiratoire", "neurologique", "cancer"]
                ),
            },
            "prix": {
                "sejour": prix_sejour,
                "soins":  prix_soins,
                "total":  prix_total,
            },
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/predictions/planification")
def predict_planification(
    date: str,
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Pour une date donnée, prédit:
    - Nombre de patients attendus
    - Ressources humaines recommandées par spécialité
    - Nombre de lits recommandés par service
    """
    try:
        target        = date_type.fromisoformat(date)
        target_dow    = target.weekday()
        target_month  = target.month

        def get_season(m: int) -> str:
            if m in (12, 1, 2): return "Hiver"
            if m in (3, 4, 5):  return "Printemps"
            if m in (6, 7, 8):  return "Ete"
            return "Automne"
        target_season = get_season(target_month)

        urg = get_urg().copy()
        etab_user = _etab_from_creds(creds)
        if etab_user:
            urg = urg[urg["Etablissement"] == etab_user]

        urg["date"]  = urg["Date_Arrivee"].dt.normalize()
        urg["dow"]   = urg["Date_Arrivee"].dt.dayofweek
        urg["month"] = urg["Date_Arrivee"].dt.month

        daily = urg.groupby("date").size().reset_index(name="count")
        daily["dow"]   = daily["date"].apply(lambda d: d.dayofweek)
        daily["month"] = daily["date"].apply(lambda d: d.month)
        mask = (daily["dow"] == target_dow) & (daily["month"] == target_month)
        predicted_patients = int(round(daily.loc[mask, "count"].mean())) if mask.sum() > 0 else \
                             int(round(daily.loc[daily["dow"] == target_dow, "count"].mean()))

        avg_daily = max(float(daily["count"].mean()), 1)
        ratio     = predicted_patients / avg_daily

        rh_rows = []
        if engine:
            with engine.connect() as conn:
                q_rh = (
                    "SELECT specialite, COUNT(*) as total, "
                    "SUM(CASE WHEN statut IN ('En service','En garde') THEN 1 ELSE 0 END) as disponibles "
                    "FROM personnel WHERE specialite IS NOT NULL AND specialite != ''"
                )
                if etab_user:
                    q_rh += " AND etablissement = :etab"
                q_rh += " GROUP BY specialite ORDER BY total DESC"
                params_rh = {"etab": etab_user} if etab_user else {}
                rows = conn.execute(text(q_rh), params_rh).fetchall()
            for r in rows:
                spec, total, disponibles = r[0], int(r[1] or 0), int(r[2] or 0)
                recommande = max(1, math.ceil(disponibles * min(ratio, 2.0)))
                ecart      = recommande - disponibles
                rh_rows.append({
                    "specialite":   spec,
                    "actuel":       int(disponibles),
                    "total_equipe": int(total),
                    "recommande":   recommande,
                    "ecart":        ecart,
                    "statut":       "critique" if ecart > 2 else "alerte" if ecart > 0 else "ok",
                })

        lits_rows = []
        taux_hospit          = float((urg["Orientation"] == "Hospitalise").sum()) / max(len(urg), 1)
        patients_hospitalises = max(1, int(round(predicted_patients * taux_hospit)))

        if engine:
            with engine.connect() as conn:
                q_lits = (
                    "SELECT service, COUNT(*) as total, "
                    "SUM(CASE WHEN statut='Disponible' THEN 1 ELSE 0 END) as disponibles "
                    "FROM lits WHERE 1=1"
                )
                if etab_user:
                    q_lits += " AND etablissement = :etab"
                q_lits += " GROUP BY service ORDER BY total DESC"
                params_lits = {"etab": etab_user} if etab_user else {}
                rows = conn.execute(text(q_lits), params_lits).fetchall()
            total_lits = sum(int(r[1] or 0) for r in rows) or 1
            for r in rows:
                service, total, disponibles = r[0], int(r[1] or 0), int(r[2] or 0)
                part   = total / total_lits
                besoin = max(1, math.ceil(patients_hospitalises * part))
                ecart  = besoin - disponibles
                lits_rows.append({
                    "service":     service,
                    "total":       int(total),
                    "disponibles": int(disponibles),
                    "besoin":      besoin,
                    "ecart":       ecart,
                    "statut":      "critique" if ecart > 3 else "alerte" if ecart > 0 else "ok",
                })

        return {
            "date":                  date,
            "jour_semaine":          ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][target_dow],
            "saison":                target_season,
            "patients_prevus":       predicted_patients,
            "patients_hospitalises": patients_hospitalises,
            "taux_hospit_pct":       round(taux_hospit * 100, 1),
            "ressources_humaines":   rh_rows,
            "lits_par_service":      lits_rows,
        }
    except ValueError as e:
        raise HTTPException(400, f"Date invalide (format attendu: YYYY-MM-DD) — {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/anomalies")
def get_anomalies(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Compare le flux horaire du dernier jour disponible vs la moyenne historique."""
    try:
        urg = get_urg()
        etab_user = _etab_from_creds(creds)
        if etab_user:
            urg = urg[urg["Etablissement"] == etab_user]
        urg = urg.copy()
        urg["heure"] = urg["Date_Arrivee"].dt.hour
        urg["date"]  = urg["Date_Arrivee"].dt.normalize()
        n_days      = max(urg["date"].nunique(), 1)
        historical  = urg.groupby("heure").size() / n_days
        last_date   = urg["date"].max()
        last_df     = urg[urg["date"] == last_date]
        last_hourly = last_df.groupby("heure").size()
        result = []
        for h in range(24):
            hist_avg  = round(float(historical.get(h, 0)), 1)
            today_val = int(last_hourly.get(h, 0))
            ecart_pct = round((today_val - hist_avg) / (hist_avg + 0.01) * 100, 1)
            result.append({
                "heure":          h,
                "historique_moy": hist_avg,
                "aujourd_hui":    today_val,
                "ecart_pct":      ecart_pct,
                "anomalie":       abs(ecart_pct) > 30,
            })
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
