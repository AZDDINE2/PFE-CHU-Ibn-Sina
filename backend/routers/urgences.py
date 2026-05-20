"""
routers/urgences.py — /api/urgences/* et /api/heatmap
"""
import pandas as pd

from fastapi import APIRouter, HTTPException
from core.data_loader import get_urg

router = APIRouter(tags=["urgences"])


def df_to_records(df):
    import numpy as np
    return [
        {k: (None if isinstance(v, float) and (np.isnan(v) or np.isinf(v)) else
             round(v, 2) if isinstance(v, float) else v)
         for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]


@router.get("/api/urgences/temporel")
def get_temporel(annees: str = "2019,2020,2021,2022,2023,2024,2025,2026"):
    try:
        urg = get_urg()
        annees_list = [int(a) for a in annees.split(",") if a.strip().isdigit()]
        urg = urg[urg["Date_Arrivee"].dt.year.isin(annees_list)]
        ts = urg.groupby(urg["Date_Arrivee"].dt.date).size().reset_index()
        ts.columns = ["ds", "y"]
        ts["ds"] = ts["ds"].astype(str)
        ts = ts.sort_values("ds")
        return df_to_records(ts)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/horaire")
def get_horaire():
    try:
        urg = get_urg()
        col = urg["Heure_Arrivee"].dropna().astype(int)
        h = col.value_counts().sort_index().reset_index()
        h.columns = ["heure", "nb_patients"]
        return df_to_records(h)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/triage")
def get_triage():
    try:
        urg = get_urg().copy()
        triage_map = {
            "p1 - critique":           "P1 - Critique",
            "p1 - urgence absolue":    "P1 - Critique",
            "critique":                "P1 - Critique",
            "immédiat":                "P1 - Critique",
            "immediat":                "P1 - Critique",
            "p2 - urgent":             "P2 - Urgent",
            "p2 - urgence relative":   "P2 - Urgent",
            "urgent":                  "P2 - Urgent",
            "très urgent":             "P2 - Urgent",
            "tres urgent":             "P2 - Urgent",
            "p3 - semi-urgent":        "P3 - Semi-urgent",
            "p3 - urgence différée":   "P3 - Semi-urgent",
            "semi-urgent":             "P3 - Semi-urgent",
            "p4 - non urgent":         "P4 - Non urgent",
            "non urgent":              "P4 - Non urgent",
        }
        urg["Niveau_Triage"] = urg["Niveau_Triage"].str.strip().apply(
            lambda x: triage_map.get(str(x).lower(), str(x)) if pd.notna(x) else x
        )
        t = urg["Niveau_Triage"].value_counts().reset_index()
        t.columns = ["triage", "count"]
        total = t["count"].sum()
        t["pct"] = (t["count"] / total * 100).round(2)
        return df_to_records(t)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/orientation")
def get_orientation():
    try:
        urg = get_urg().copy()
        orient_map = {
            "retour domicile": "Domicile", "retour_domicile": "Domicile",
            "domicile": "Domicile",
            "hospitalisation": "Hospitalise", "hospitalisé": "Hospitalise",
            "hospitalise": "Hospitalise",
            "transfert": "Transfere", "transferé": "Transfere",
            "transfere": "Transfere",
            "décès": "Decede", "deces": "Decede", "décédé": "Decede",
            "decede": "Decede",
            "fugue": "Fugue",
        }
        urg["Orientation"] = urg["Orientation"].str.strip().apply(
            lambda x: orient_map.get(str(x).lower(), str(x)) if pd.notna(x) else x
        )
        o = urg["Orientation"].value_counts().reset_index()
        o.columns = ["orientation", "count"]
        total = o["count"].sum()
        o["pct"] = (o["count"] / total * 100).round(2)
        return df_to_records(o)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/annuel")
def get_annuel():
    try:
        urg = get_urg()
        a = urg.groupby("Annee").size().reset_index(name="nb_patients")
        a = a.sort_values("Annee")
        a["variation_pct"] = a["nb_patients"].pct_change().mul(100).round(2)
        a["variation_pct"] = a["variation_pct"].fillna(0)
        return df_to_records(a)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/saison")
def get_saison():
    try:
        urg = get_urg()
        ordre = ["Hiver", "Printemps", "Eté", "Automne"]
        s = urg["Saison"].value_counts().reset_index()
        s.columns = ["saison", "nb_patients"]
        s["saison"] = s["saison"].str.replace("Été", "Eté")
        s["order"] = s["saison"].apply(lambda x: ordre.index(x) if x in ordre else 99)
        s = s.sort_values("order").drop(columns="order")
        return df_to_records(s)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/jour")
def get_jour():
    try:
        urg = get_urg()
        jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        col = urg["Jour_Semaine"].dropna().astype(int)
        j = col.value_counts().sort_index().reset_index()
        j.columns = ["Jour_Semaine", "nb_patients"]
        j["jour"] = j["Jour_Semaine"].apply(lambda x: jours[x] if 0 <= x <= 6 else str(x))
        return df_to_records(j[["jour", "nb_patients"]])
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/top_motifs")
def get_top_motifs():
    try:
        urg = get_urg().copy()
        if "Motif_Consultation" not in urg.columns:
            return []
        total = len(urg)
        motif_counts = urg["Motif_Consultation"].value_counts()
        results = []
        for motif, count in motif_counts.head(15).items():
            grp = urg[urg["Motif_Consultation"] == motif]
            triage_dist = grp["Niveau_Triage"].value_counts()
            triage_principal = str(triage_dist.index[0]) if len(triage_dist) else "N/A"
            p1_rate    = round(float((grp["Niveau_Triage"] == "P1 - Critique").sum()) / len(grp) * 100, 1)
            hospit_rate = round(float((grp["Orientation"] == "Hospitalise").sum()) / len(grp) * 100, 1)
            avg_duree  = int(grp["Duree_Sejour_min"].mean()) if "Duree_Sejour_min" in grp.columns else 0
            if "Annee" in urg.columns:
                annee_max    = int(urg["Annee"].max())
                count_recent = int((grp["Annee"] == annee_max).sum())
                count_avant  = int((grp["Annee"] == annee_max - 1).sum())
                tendance = round((count_recent - count_avant) / count_avant * 100, 1) if count_avant > 0 else 0.0
            else:
                tendance = 0.0
            results.append({
                "motif":            str(motif),
                "count":            int(count),
                "pct":              round(count / total * 100, 1),
                "triage_principal": triage_principal,
                "p1_rate":          p1_rate,
                "hospit_rate":      hospit_rate,
                "avg_duree":        avg_duree,
                "tendance":         tendance,
            })
        return results
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/maladies_saisonnieres")
def get_maladies_saisonnieres():
    """
    Pour chaque saison, retourne le top 5 des motifs de consultation
    avec le nombre de cas, le taux de criticité P1 et la durée moyenne.
    """
    try:
        urg = get_urg().copy()
        if "Motif_Consultation" not in urg.columns or "Saison" not in urg.columns:
            return []

        urg["Saison"] = urg["Saison"].str.replace("Été", "Ete").str.replace("Eté", "Ete")
        saisons_ordre = ["Hiver", "Printemps", "Ete", "Automne"]

        result = []
        for saison in saisons_ordre:
            grp_saison = urg[urg["Saison"] == saison]
            if grp_saison.empty:
                continue
            total_saison = len(grp_saison)
            top_motifs   = grp_saison["Motif_Consultation"].value_counts().head(5)
            maladies = []
            for motif, count in top_motifs.items():
                grp_m  = grp_saison[grp_saison["Motif_Consultation"] == motif]
                p1     = round(float((grp_m["Niveau_Triage"] == "P1 - Critique").sum()) / len(grp_m) * 100, 1)
                duree  = int(grp_m["Duree_Sejour_min"].mean()) if "Duree_Sejour_min" in grp_m.columns else 0
                hospit = round(float((grp_m["Orientation"] == "Hospitalise").sum()) / len(grp_m) * 100, 1)
                maladies.append({
                    "motif":       str(motif),
                    "count":       int(count),
                    "pct":         round(count / total_saison * 100, 1),
                    "p1_rate":     p1,
                    "hospit_rate": hospit,
                    "avg_duree":   duree,
                })
            result.append({
                "saison":          saison,
                "total_patients":  total_saison,
                "maladies":        maladies,
            })
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/urgences/liste")
def get_urgences_liste(
    limit: int = 10000,
    offset: int = 0,
    annee: str = "",
    etablissement: str = "",
    niveau: str = "",
    orientation: str = "",
):
    try:
        urg = get_urg()
        if annee:
            annees = [int(a) for a in annee.split(",") if a.strip().isdigit()]
            if annees and "Annee" in urg.columns:
                urg = urg[urg["Annee"].isin(annees)]
        if etablissement and etablissement != "Tous" and "Etablissement" in urg.columns:
            urg = urg[urg["Etablissement"] == etablissement]
        if niveau and niveau != "Tous" and "Niveau_Triage" in urg.columns:
            urg = urg[urg["Niveau_Triage"] == niveau]
        if orientation and orientation != "Tous" and "Orientation" in urg.columns:
            urg = urg[urg["Orientation"] == orientation]

        cols = ["IPP", "Nom_Complet", "CIN", "Age", "Sexe",
                "Groupe_Sanguin", "Antecedents", "Niveau_Triage", "Date_Arrivee",
                "Etablissement", "Orientation", "Duree_Sejour_min", "Saison", "Annee",
                "Mutuelle", "Prix_Sejour", "Prix_Soins"]
        available = [c for c in cols if c in urg.columns]
        df = urg[available].copy()
        if "Date_Arrivee" in df.columns:
            df = df.sort_values("Date_Arrivee", ascending=False)

        limit = min(limit, 50000)
        df    = df.iloc[offset: offset + limit]
        df["Date_Arrivee"] = df["Date_Arrivee"].astype(str)
        if "IPP" in df.columns:
            df = df.rename(columns={"IPP": "id_passage"})
        return df_to_records(df)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/api/heatmap")
def get_heatmap():
    try:
        urg = get_urg()
        JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        urg2 = urg.copy()
        urg2["jour_num"] = pd.to_datetime(urg2["Date_Arrivee"]).dt.weekday
        hm = urg2.groupby(["Heure_Arrivee", "jour_num"]).size().reset_index(name="count")
        result = []
        for _, row in hm.iterrows():
            result.append({
                "heure":    int(row["Heure_Arrivee"]),
                "jour":     JOURS[int(row["jour_num"])],
                "jour_num": int(row["jour_num"]),
                "count":    int(row["count"]),
            })
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
