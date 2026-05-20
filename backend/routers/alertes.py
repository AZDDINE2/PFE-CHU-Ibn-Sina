"""
routers/alertes.py — /api/alertes, /api/alertes/config, /api/alertes/check
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.database import data
from core.data_loader import get_urg

router = APIRouter(tags=["alertes"])

# ── État global du router ─────────────────────────────────────────────────────
_alert_config = {
    "duree_moy_seuil":   240,
    "taux_fugue_seuil":  3.0,
    "taux_p1_seuil":     5.0,
    "taux_hospit_seuil": 35.0,
}


class AlertConfig(BaseModel):
    duree_moy_seuil:   float = 240
    taux_fugue_seuil:  float = 3.0
    taux_p1_seuil:     float = 5.0
    taux_hospit_seuil: float = 35.0


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/api/alertes")
def get_alertes():
    try:
        etab    = data["etab"]
        alertes = []
        for _, row in etab.iterrows():
            if row.get("Taux_Hospit_Pct", 0) > 35:
                alertes.append({
                    "etablissement": row["nom"],
                    "type":          "Taux hospitalisation élevé",
                    "valeur":        f"{row['Taux_Hospit_Pct']}%",
                    "seuil":         "35%",
                    "niveau":        "critique" if row["Taux_Hospit_Pct"] > 45 else "warning",
                })
            if row.get("Taux_Fugue_Pct", 0) > 12:
                alertes.append({
                    "etablissement": row["nom"],
                    "type":          "Taux de fugue élevé",
                    "valeur":        f"{row['Taux_Fugue_Pct']}%",
                    "seuil":         "12%",
                    "niveau":        "warning",
                })
            if row.get("Duree_Moy_Min", 0) > 300:
                alertes.append({
                    "etablissement": row["nom"],
                    "type":          "Durée séjour excessive",
                    "valeur":        f"{row['Duree_Moy_Min']} min",
                    "seuil":         "300 min",
                    "niveau":        "critique",
                })
        return alertes
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/alertes/config")
def get_alert_config():
    return _alert_config


@router.post("/api/alertes/config")
def set_alert_config(cfg: AlertConfig):
    _alert_config.update(cfg.dict())
    return {"message": "Configuration mise à jour", "config": _alert_config}


@router.get("/api/alertes/check")
def check_alertes():
    try:
        urg   = get_urg()
        total = len(urg)
        duree_moy   = round(float(urg["Duree_Sejour_min"].mean()), 1)
        taux_fugue  = round(len(urg[urg["Orientation"] == "Fugue"])     / total * 100, 2)
        taux_p1     = round(len(urg[urg["Niveau_Triage"].str.startswith("P1", na=False)]) / total * 100, 2)
        taux_hospit = round(len(urg[urg["Orientation"] == "Hospitalise"]) / total * 100, 2)
        alertes = []
        if duree_moy > _alert_config["duree_moy_seuil"]:
            alertes.append({
                "type":   "Durée séjour",
                "valeur": f"{duree_moy} min",
                "seuil":  f"{_alert_config['duree_moy_seuil']} min",
                "niveau": "critique",
            })
        if taux_fugue > _alert_config["taux_fugue_seuil"]:
            alertes.append({
                "type":   "Taux de fugue",
                "valeur": f"{taux_fugue}%",
                "seuil":  f"{_alert_config['taux_fugue_seuil']}%",
                "niveau": "warning",
            })
        if taux_p1 > _alert_config["taux_p1_seuil"]:
            alertes.append({
                "type":   "Cas critiques P1",
                "valeur": f"{taux_p1}%",
                "seuil":  f"{_alert_config['taux_p1_seuil']}%",
                "niveau": "critique",
            })
        if taux_hospit > _alert_config["taux_hospit_seuil"]:
            alertes.append({
                "type":   "Taux hospitalisation",
                "valeur": f"{taux_hospit}%",
                "seuil":  f"{_alert_config['taux_hospit_seuil']}%",
                "niveau": "warning",
            })
        return {
            "alertes": alertes,
            "stats": {
                "duree_moy":   duree_moy,
                "taux_fugue":  taux_fugue,
                "taux_p1":     taux_p1,
                "taux_hospit": taux_hospit,
            },
            "config": _alert_config,
        }
    except Exception as e:
        raise HTTPException(500, str(e))
