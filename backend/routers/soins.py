"""
routers/soins.py — /api/soins/*
"""
from fastapi import APIRouter, HTTPException
from core.data_loader import get_soins

router = APIRouter(tags=["soins"])


def df_to_records(df):
    import numpy as np
    return [
        {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v)) else
             round(v, 2) if isinstance(v, float) else v)
         for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


@router.get("/api/soins/types")
def get_soins_types():
    try:
        s = get_soins()["Type_Soin"].value_counts().reset_index()
        s.columns = ["type_soin", "count"]
        return df_to_records(s.head(15))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/soins/couts_par_type")
def get_couts_par_type():
    try:
        s = get_soins().groupby("Type_Soin")["Cout_Soin"].mean().reset_index()
        s.columns = ["type_soin", "cout_moyen"]
        s["cout_moyen"] = s["cout_moyen"].round(2)
        s = s.sort_values("cout_moyen", ascending=False).head(15)
        return df_to_records(s)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/soins/couts_par_etab")
def get_couts_par_etab():
    try:
        s = get_soins().groupby("Etablissement")["Cout_Soin"].sum().reset_index()
        s.columns = ["etablissement", "cout_total"]
        s["cout_total"] = s["cout_total"].round(2)
        s = s.sort_values("cout_total", ascending=False)
        return df_to_records(s)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/soins/resultats")
def get_resultats():
    try:
        s = get_soins()["Resultat"].value_counts().reset_index()
        s.columns = ["resultat", "count"]
        return df_to_records(s)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/soins/medicaments")
def get_medicaments():
    try:
        s = get_soins()["Medicament"].value_counts().reset_index()
        s.columns = ["medicament", "count"]
        return df_to_records(s.head(12))
    except Exception as e:
        raise HTTPException(500, str(e))
