"""
routers/pipeline.py — /api/pipeline/status, /api/pipeline/run
"""
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import text

from core.database import engine
from core.auth import security
from core.data_loader import reload_urg

router = APIRouter(tags=["pipeline"])


@router.get("/api/pipeline/status")
def pipeline_status():
    """Retourne le nombre de lignes dans chaque couche."""
    if not engine:
        raise HTTPException(503, "PostgreSQL non disponible")
    try:
        with engine.connect() as conn:
            bronze_urg   = conn.execute(text("SELECT COUNT(*) FROM urgences_bronze")).scalar()
            bronze_soins = conn.execute(text("SELECT COUNT(*) FROM soins_bronze")).scalar()
            bronze_etab  = conn.execute(text("SELECT COUNT(*) FROM etablissements_bronze")).scalar()
            gold_urg     = conn.execute(text("SELECT COUNT(*) FROM urgences")).scalar()
            gold_soins   = conn.execute(text("SELECT COUNT(*) FROM soins")).scalar()
            gold_etab    = conn.execute(text("SELECT COUNT(*) FROM etablissements")).scalar()
        return {
            "bronze": {"urgences": bronze_urg, "soins": bronze_soins, "etablissements": bronze_etab},
            "gold":   {"urgences": gold_urg,   "soins": gold_soins,   "etablissements": gold_etab},
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/pipeline/run")
def run_pipeline(creds: HTTPAuthorizationCredentials = Depends(security)):
    """Transforme Bronze → Gold avec enrichissement des colonnes."""
    if not engine:
        raise HTTPException(503, "PostgreSQL non disponible")
    try:
        SAISONS  = {12:"Hiver",1:"Hiver",2:"Hiver",3:"Printemps",4:"Printemps",5:"Printemps",
                    6:"Ete",7:"Ete",8:"Ete",9:"Automne",10:"Automne",11:"Automne"}
        JOURS_FR = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]
        TRANCHES = {**{h:"Nuit"       for h in list(range(0, 6)) + [23]},
                    **{h:"Matin"      for h in range(6, 12)},
                    **{h:"Apres-midi" for h in range(12, 18)},
                    **{h:"Soir"       for h in range(18, 23)}}

        df = pd.read_sql("SELECT * FROM urgences_bronze", engine)
        df["date_arrivee"] = pd.to_datetime(df["date_arrivee"], errors="coerce")
        df["date_sortie"]  = pd.to_datetime(df["date_sortie"],  errors="coerce")

        df["Saison"]          = df["date_arrivee"].dt.month.map(SAISONS)
        df["Heure_Arrivee"]   = df["date_arrivee"].dt.hour
        df["Jour_Semaine"]    = df["date_arrivee"].dt.weekday
        df["Mois"]            = df["date_arrivee"].dt.month
        df["Annee"]           = df["date_arrivee"].dt.year
        df["Nom_Jour"]        = df["Jour_Semaine"].apply(
            lambda x: JOURS_FR[int(x)] if pd.notna(x) and 0 <= int(x) <= 6 else ""
        )
        df["Tranche_Horaire"] = df["Heure_Arrivee"].apply(
            lambda h: TRANCHES.get(int(h), "Inconnu") if pd.notna(h) else "Inconnu"
        )
        df["Groupe_Age"] = df["age"].apply(
            lambda a: (
                "Enfant"       if pd.notna(a) and a < 15  else
                "Adulte jeune" if pd.notna(a) and a < 30  else
                "Adulte"       if pd.notna(a) and a < 60  else
                "Senior"       if pd.notna(a)              else
                "Inconnu"
            )
        )
        df["Est_Pic"]    = df["Heure_Arrivee"].apply(lambda h: 1 if pd.notna(h) and 8 <= h < 20 else 0)
        df["Type_Etab"]  = df["type_etab"]  if "type_etab"  in df.columns else "CHU"
        df["Ville"]      = df["ville"]       if "ville"      in df.columns else "Rabat"
        df["Jour_Ferie"] = df["jour_ferie"]  if "jour_ferie" in df.columns else 0
        df["Mutuelle"]   = df["mutuelle"]    if "mutuelle"   in df.columns else "Payant"
        df["Prix_Sejour"]= df["prix_sejour"] if "prix_sejour" in df.columns else 0.0
        df["Prix_Soins"] = df["prix_soins"]  if "prix_soins"  in df.columns else 0.0

        rename_map = {
            "IPP": "IPP",
            "nom_complet": "Nom_Complet", "age": "Age", "sexe": "Sexe",
            "cin": "CIN", "groupe_sanguin": "Groupe_Sanguin",
            "antecedents": "Antecedents", "etablissement": "Etablissement",
            "date_arrivee": "Date_Arrivee", "date_sortie": "Date_Sortie",
            "niveau_triage": "Niveau_Triage", "motif_consultation": "Motif_Consultation",
            "orientation": "Orientation", "duree_sejour_min": "Duree_Sejour_min",
            "nb_medecins_dispo": "Nb_Medecins_Dispo", "nb_lits_dispo": "Nb_Lits_Dispo",
        }
        df = df.rename(columns=rename_map)

        gold_cols = [
            "IPP","Nom_Complet","Age","Sexe","CIN","Groupe_Sanguin",
            "Antecedents","Etablissement","Type_Etab","Ville","Date_Arrivee","Date_Sortie",
            "Niveau_Triage","Motif_Consultation","Orientation","Duree_Sejour_min",
            "Nb_Medecins_Dispo","Nb_Lits_Dispo","Jour_Ferie","Saison","Heure_Arrivee",
            "Jour_Semaine","Mois","Annee","Tranche_Horaire","Nom_Jour","Groupe_Age","Est_Pic",
            "Mutuelle","Prix_Sejour","Prix_Soins",
        ]
        df_gold = df[[c for c in gold_cols if c in df.columns]]

        with engine.connect() as _conn:
            existing_ids = set(
                pd.read_sql('SELECT DISTINCT "IPP" FROM urgences', engine)["IPP"].astype(str)
            )
        df_gold["_id_str"] = df_gold["IPP"].astype(str)
        df_new  = df_gold[~df_gold["_id_str"].isin(existing_ids)].drop(columns=["_id_str"])
        df_gold.drop(columns=["_id_str"], inplace=True, errors="ignore")

        new_count = len(df_new)
        if new_count > 0:
            df_new.to_sql("urgences", engine, if_exists="append", index=False,
                          method="multi", chunksize=500)

        reload_urg()

        bronze_count = len(df)
        total_gold   = bronze_count
        return {
            "success":      True,
            "message":      f"Pipeline terminé : {new_count} nouvelles lignes insérées ({bronze_count} Bronze, {total_gold} Gold total)",
            "bronze_rows":  bronze_count,
            "new_rows":     new_count,
            "gold_rows":    total_gold,
        }
    except Exception as e:
        import traceback
        print("PIPELINE ERROR:", traceback.format_exc())
        raise HTTPException(500, str(e))
