"""
routers/etablissements.py — /api/etablissements, /api/etablissements/carte
"""
import pandas as pd
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from core.database import engine, data

router = APIRouter(tags=["etablissements"])


def df_to_records(df):
    import numpy as np
    return [
        {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v)) else
             round(v, 2) if isinstance(v, float) else v)
         for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


COORDS = {
    "Hopital Ibn Sina":   {"lat": 34.0209, "lng": -6.8416},
    "Hopital des Enfants": {"lat": 34.0132, "lng": -6.8326},
    "Hopital Al Ayachi":  {"lat": 34.0369, "lng": -6.8326},
    "Hopital Ar-Razi":    {"lat": 34.0442, "lng": -6.7985},
    "Hopital des Specialites": {"lat": 34.0178, "lng": -6.8356},
    "Hopital de Maternite et de Sante Reproductrice les Orangers": {"lat": 34.0089, "lng": -6.8512},
    "Hopital Moulay Youssef": {"lat": 34.0156, "lng": -6.8423},
    "Hopital de Maternite Souissi": {"lat": 33.9956, "lng": -6.8512},
}


@router.get("/api/etablissements")
def get_etablissements():
    try:
        if engine:
            df = pd.read_sql('SELECT * FROM etablissements ORDER BY Nb_Patients DESC', engine)
            data["etab"] = df
            return df_to_records(df)
        return df_to_records(data["etab"])
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/etablissements/carte")
def get_carte():
    try:
        etab   = data["etab"]
        result = []
        for _, row in etab.iterrows():
            coords = COORDS.get(row["nom"], {"lat": 34.02, "lng": -6.84})
            result.append({
                "nom":             row["nom"],
                "type_etab":       row["type_etab"],
                "ville":           row["ville"],
                "lat":             coords["lat"],
                "lng":             coords["lng"],
                "capacite_lits":   int(row["capacite_lits"]),
                "nb_medecins":     int(row["nb_medecins"]),
                "Nb_Patients":     int(row.get("Nb_Patients", 0)),
                "Taux_Hospit_Pct": round(float(row.get("Taux_Hospit_Pct", 0)), 2),
                "Duree_Moy_Min":   round(float(row.get("Duree_Moy_Min", 0)), 1),
                "Alerte_Charge":   row.get("Alerte_Charge", "Normal"),
            })
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
