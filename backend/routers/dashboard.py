"""
routers/dashboard.py — /api/kpis, /api/kpis/live, /api/status, /api/stats/*
"""
import pandas as pd

from fastapi import APIRouter, HTTPException
from core.database import data
from core.data_loader import get_urg

router = APIRouter(tags=["dashboard"])


def df_to_records(df):
    import numpy as np
    return [
        {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v)) else
             round(v, 2) if isinstance(v, float) else v)
         for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


# ── STATUS ────────────────────────────────────────────────────────────────────
@router.get("/api/status")
def get_status():
    urg_loaded   = not data.get("urg",   pd.DataFrame()).empty
    soins_loaded = not data.get("soins", pd.DataFrame()).empty
    return {
        "ready":        urg_loaded and soins_loaded,
        "urg_loaded":   urg_loaded,
        "soins_loaded": soins_loaded,
        "urg_rows":     len(data["urg"])   if urg_loaded   else 0,
        "soins_rows":   len(data["soins"]) if soins_loaded else 0,
    }


# ── KPIs ──────────────────────────────────────────────────────────────────────
@router.get("/api/kpis")
def get_kpis(annees: str = "", orientation: str = ""):
    try:
        urg = get_urg()
        if annees:
            annees_list = [int(a) for a in annees.split(",") if a.strip().isdigit()]
            if annees_list and "Annee" in urg.columns:
                urg = urg[urg["Annee"].isin(annees_list)]
        if orientation and orientation != "Toutes":
            urg = urg[urg["Orientation"] == orientation]
        total = len(urg)
        if total == 0:
            return {"total": 0, "patients_par_jour": 0, "duree_moy": 0,
                    "taux_hospit": 0, "taux_fugue": 0, "taux_p1": 0}
        nb_jours    = urg["Date_Arrivee"].dt.date.nunique()
        par_jour    = round(total / nb_jours, 1) if nb_jours > 0 else 0
        duree_moy   = round(urg["Duree_Sejour_min"].mean(), 1)
        taux_hospit = round(len(urg[urg["Orientation"] == "Hospitalise"]) / total * 100, 2)
        taux_fugue  = round(len(urg[urg["Orientation"] == "Fugue"])       / total * 100, 2)
        taux_p1     = round(len(urg[urg["Niveau_Triage"].str.startswith("P1", na=False)]) / total * 100, 2)
        return {
            "total":            total,
            "patients_par_jour": par_jour,
            "duree_moy":        duree_moy,
            "taux_hospit":      taux_hospit,
            "taux_fugue":       taux_fugue,
            "taux_p1":          taux_p1,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── KPIs LIVE ─────────────────────────────────────────────────────────────────
@router.get("/api/kpis/live")
def get_kpis_live():
    """KPIs pour AUJOURD'HUI uniquement — temps réel."""
    try:
        urg = get_urg()
        today = pd.Timestamp.now().normalize()
        today_df = urg[urg["Date_Arrivee"].dt.normalize() == today]
        total_today = len(today_df)

        now = pd.Timestamp.now()
        date_sortie = pd.to_datetime(urg["Date_Sortie"], errors="coerce", format="mixed")
        actifs = urg[
            (urg["Date_Arrivee"].dt.normalize() == today) &
            (date_sortie.isna() | (date_sortie >= now))
        ]

        taux_p1 = 0.0
        if total_today > 0:
            taux_p1 = round(
                len(today_df[today_df["Niveau_Triage"].str.startswith("P1", na=False)]) / total_today * 100, 1
            )

        etab = data.get("etab", pd.DataFrame())
        total_lits = int(etab["capacite_lits"].sum()) if not etab.empty and "capacite_lits" in etab.columns else 500
        lits_occupes = min(len(actifs), total_lits)
        taux_charge  = round(lits_occupes / total_lits * 100, 1) if total_lits > 0 else 0

        return {
            "patients_aujourd_hui": total_today,
            "patients_actifs":      len(actifs),
            "lits_occupes":         lits_occupes,
            "total_lits":           total_lits,
            "taux_charge":          taux_charge,
            "taux_p1_aujourd_hui":  taux_p1,
            "heure_maj":            now.strftime("%H:%M:%S"),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── STATS RESUME ──────────────────────────────────────────────────────────────
@router.get("/api/stats/resume")
def get_stats_resume():
    try:
        urg = get_urg()
        s = urg["Duree_Sejour_min"]
        return {
            "duree_sejour": {
                "min":    round(float(s.min()), 1),
                "max":    round(float(s.max()), 1),
                "mean":   round(float(s.mean()), 1),
                "median": round(float(s.median()), 1),
                "p25":    round(float(s.quantile(0.25)), 1),
                "p75":    round(float(s.quantile(0.75)), 1),
                "p90":    round(float(s.quantile(0.90)), 1),
                "std":    round(float(s.std()), 1),
            },
            "age": {
                "mean":   round(float(urg["Age"].mean()), 1),
                "median": round(float(urg["Age"].median()), 1),
                "min":    int(urg["Age"].min()),
                "max":    int(urg["Age"].max()),
            },
            "triage_dist":      urg["Niveau_Triage"].value_counts().to_dict(),
            "orientation_dist": urg["Orientation"].value_counts().to_dict(),
            "saison_dist":      urg["Saison"].value_counts().to_dict(),
            "groupe_age_dist":  urg["Groupe_Age"].value_counts().to_dict(),
            "annees":           sorted(urg["Annee"].dropna().astype(int).unique().tolist()),
            "total":            len(urg),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


# ── STATS COMPARAISON PERIODES ────────────────────────────────────────────────
@router.get("/api/stats/comparaison")
def get_comparaison_periodes():
    try:
        urg = get_urg()
        urg2 = urg.copy()
        urg2["date"] = pd.to_datetime(urg2["Date_Arrivee"])
        max_date = urg2["date"].max()
        sem_act  = urg2[urg2["date"] > max_date - pd.Timedelta(days=7)]
        sem_prec = urg2[
            (urg2["date"] > max_date - pd.Timedelta(days=14)) &
            (urg2["date"] <= max_date - pd.Timedelta(days=7))
        ]

        def stats(df):
            if len(df) == 0:
                return {"patients": 0, "duree_moy": 0, "taux_fugue": 0, "taux_p1": 0}
            return {
                "patients":   len(df),
                "duree_moy":  round(float(df["Duree_Sejour_min"].mean()), 1),
                "taux_fugue": round(len(df[df["Orientation"] == "Fugue"]) / len(df) * 100, 2),
                "taux_p1":    round(len(df[df["Niveau_Triage"].str.startswith("P1", na=False)]) / len(df) * 100, 2),
            }

        act  = stats(sem_act)
        prec = stats(sem_prec)

        def delta(a, b):
            return round(a - b, 2) if b != 0 else 0

        return {
            "actuelle":          act,
            "precedente":        prec,
            "delta":             {k: delta(act[k], prec[k]) for k in act},
            "periode_actuelle":  max_date.strftime("%d/%m/%Y"),
            "periode_precedente": (max_date - pd.Timedelta(days=7)).strftime("%d/%m/%Y"),
        }
    except Exception as e:
        raise HTTPException(500, str(e))
