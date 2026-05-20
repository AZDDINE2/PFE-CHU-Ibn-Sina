"""
ETL Pipeline — CHU Ibn Sina
Source CSV  →  Bronze  →  Silver  →  Gold  →  MySQL
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy import create_engine, text

# ── Chemins ─────────────────────────────────────────────────────────────────
ROOT        = os.environ.get("DATA_ROOT", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
DATA_DIR    = os.path.join(ROOT, "data")
BRONZE_DIR  = os.path.join(DATA_DIR, "bronze")
SILVER_DIR  = os.path.join(DATA_DIR, "silver")
GOLD_DIR    = os.path.join(DATA_DIR, "gold")
LOG_FILE    = os.path.join(DATA_DIR, "logs", "etl.log")

SOURCE_URG  = os.path.join(BRONZE_DIR, "urgences_bronze.csv")  # source immuable

for d in (BRONZE_DIR, SILVER_DIR, GOLD_DIR, os.path.dirname(LOG_FILE)):
    os.makedirs(d, exist_ok=True)

# ── Lookup tables ───────────────────────────────────────────────────────────
SAISONS = {12:"Hiver",1:"Hiver",2:"Hiver",
           3:"Printemps",4:"Printemps",5:"Printemps",
           6:"Ete",7:"Ete",8:"Ete",
           9:"Automne",10:"Automne",11:"Automne"}

TRANCHES = {**{h:"Nuit"       for h in [0,1,2,3,4,5,23]},
            **{h:"Matin"      for h in range(6,12)},
            **{h:"Apres-midi" for h in range(12,18)},
            **{h:"Soir"       for h in range(18,23)}}

JOURS_FR = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"]

# ── Logger ───────────────────────────────────────────────────────────────────
class ETLLogger:
    def __init__(self):
        self.lines: list[str] = []

    def log(self, msg: str):
        ts  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{ts}] {msg}"
        print(line)
        self.lines.append(line)

    def flush(self):
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write("\n".join(self.lines) + "\n")
        except Exception:
            pass


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1 — BRONZE  (chargement brut)
# ════════════════════════════════════════════════════════════════════════════
def step_bronze(logger: ETLLogger) -> pd.DataFrame:
    """
    Charge le fichier Bronze (urgences_bronze.csv) tel quel.
    Seule transformation : ajout de métadonnées de traçabilité.
    """
    logger.log("── Bronze : chargement de urgences_bronze.csv ──")
    df = pd.read_csv(SOURCE_URG, encoding="utf-8-sig", low_memory=False)
    logger.log(f"  {len(df):,} lignes × {len(df.columns)} colonnes chargées")

    # Métadonnées de traçabilité (colonnes internes, supprimées en Silver)
    df["_source"]    = os.path.basename(SOURCE_URG)
    df["_loaded_at"] = datetime.now().isoformat()
    return df


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2 — SILVER  (nettoyage et validation)
# ════════════════════════════════════════════════════════════════════════════
def step_silver(df: pd.DataFrame, logger: ETLLogger) -> pd.DataFrame:
    """
    Nettoie et valide les données Bronze.
    Règles : supprimer doublons, corriger types, borner dates et âges.
    """
    logger.log("── Silver : nettoyage et validation ──")
    n0 = len(df)

    # 1. Supprimer colonnes de traçabilité temporaires
    df = df.drop(columns=["_source", "_loaded_at"], errors="ignore")

    # 2. Normaliser les noms de colonnes (strip whitespace)
    df.columns = [c.strip() for c in df.columns]

    # 3. Convertir IPP en entier (le CSV peut avoir des floats comme 138052.0)
    df["IPP"] = pd.to_numeric(df["IPP"], errors="coerce")
    df = df.dropna(subset=["IPP"])
    df["IPP"] = df["IPP"].astype(int)

    # 4. Supprimer les doublons sur IPP (garder la première occurrence)
    before_dedup = len(df)
    df = df.drop_duplicates(subset=["IPP"], keep="first")
    logger.log(f"  Doublons supprimés : {before_dedup - len(df):,}")

    # 5. Convertir les dates
    df["Date_Arrivee"] = pd.to_datetime(df["Date_Arrivee"], errors="coerce", format="mixed")
    df["Date_Sortie"]  = pd.to_datetime(df["Date_Sortie"],  errors="coerce", format="mixed")

    # 6. Supprimer les lignes sans date d'arrivée
    df = df.dropna(subset=["Date_Arrivee"])

    # 7. Borner les dates (2010 → aujourd'hui)
    date_min = pd.Timestamp("2010-01-01")
    date_max = pd.Timestamp.now()
    invalides_dates = ((df["Date_Arrivee"] < date_min) | (df["Date_Arrivee"] > date_max)).sum()
    df = df[(df["Date_Arrivee"] >= date_min) & (df["Date_Arrivee"] <= date_max)]
    if invalides_dates:
        logger.log(f"  Dates hors bornes supprimées : {invalides_dates:,}")

    # 8. Nettoyer l'âge
    df["Age"] = pd.to_numeric(df["Age"], errors="coerce")
    invalides_age = ((df["Age"] < 0) | (df["Age"] > 120)).sum()
    df.loc[(df["Age"] < 0) | (df["Age"] > 120), "Age"] = np.nan
    if invalides_age:
        logger.log(f"  Âges invalides mis à NaN : {invalides_age:,}")

    # 9. Normaliser les chaînes (strip + capitalize pour Sexe)
    for col in ["Sexe", "Etablissement", "Niveau_Triage", "Orientation", "Motif_Consultation"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
    df["Sexe"] = df["Sexe"].str.upper().map({"M": "M", "F": "F"}).fillna("M")

    # 10. Durée séjour : valeurs négatives ou nulles → médiane
    df["Duree_Sejour_min"] = pd.to_numeric(df["Duree_Sejour_min"], errors="coerce")
    med_duree = df.loc[df["Duree_Sejour_min"] > 0, "Duree_Sejour_min"].median()
    df.loc[df["Duree_Sejour_min"] <= 0, "Duree_Sejour_min"] = med_duree

    # 11. Remplir les valeurs manquantes critiques
    df["Mutuelle"]    = df["Mutuelle"].fillna("Payant").astype(str).str.strip()
    df["Prix_Sejour"] = pd.to_numeric(df["Prix_Sejour"], errors="coerce").fillna(0.0)
    df["Prix_Soins"]  = pd.to_numeric(df["Prix_Soins"],  errors="coerce").fillna(0.0)
    df["Antecedents"] = df["Antecedents"].fillna("Aucun").astype(str).str.strip()

    logger.log(f"  Silver : {len(df):,} lignes valides (éliminé {n0 - len(df):,})")

    out = os.path.join(SILVER_DIR, "urgences_silver.csv")
    df.to_csv(out, index=False, encoding="utf-8-sig")
    logger.log(f"  Silver sauvegardé : {out}")
    return df


# ════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3 — GOLD  (enrichissement + écriture MySQL)
# ════════════════════════════════════════════════════════════════════════════
def step_gold(df: pd.DataFrame, engine, logger: ETLLogger, mode: str = "incremental") -> dict:
    """
    Recalcule toutes les colonnes dérivées depuis Silver et écrit en MySQL.
    mode='incremental' : n'insère que les nouveaux IPP.
    mode='full'        : remplace tout (DROP + INSERT).
    """
    logger.log(f"── Gold : enrichissement ({mode}) ──")

    # ── Colonnes dérivées recalculées ────────────────────────────────────
    df["Saison"]          = df["Date_Arrivee"].dt.month.map(SAISONS).fillna("Inconnu")
    df["Heure_Arrivee"]   = df["Date_Arrivee"].dt.hour.astype(int)
    df["Jour_Semaine"]    = df["Date_Arrivee"].dt.dayofweek.astype(int)
    df["Mois"]            = df["Date_Arrivee"].dt.month.astype(int)
    df["Annee"]           = df["Date_Arrivee"].dt.year.astype(int)
    df["Nom_Jour"]        = df["Jour_Semaine"].map(lambda x: JOURS_FR[x])
    df["Tranche_Horaire"] = df["Heure_Arrivee"].map(lambda h: TRANCHES.get(h, "Inconnu"))
    df["Groupe_Age"]      = df["Age"].map(
        lambda a: "Enfant" if pd.notna(a) and a < 15
        else "Adulte jeune" if pd.notna(a) and a < 30
        else "Adulte" if pd.notna(a) and a < 60
        else "Senior" if pd.notna(a) else "Inconnu"
    )
    df["Est_Pic"]         = df["Heure_Arrivee"].map(lambda h: 1 if 8 <= h < 20 else 0).astype(int)
    df["Jour_Ferie"]      = df.get("Jour_Ferie", pd.Series(0, index=df.index)).fillna(0).astype(int)

    # Colonnes fixes
    df["Type_Etab"] = df.get("Type_Etab", "CHU").fillna("CHU")
    df["Ville"]     = df.get("Ville",     "Rabat").fillna("Rabat")

    # ── Formater les dates pour MySQL ────────────────────────────────────
    df["Date_Arrivee"] = df["Date_Arrivee"].dt.strftime("%Y-%m-%d %H:%M:%S")
    df["Date_Sortie"]  = df["Date_Sortie"].dt.strftime("%Y-%m-%d %H:%M:%S").where(
        df["Date_Sortie"].notna(), other=None
    ) if "Date_Sortie" in df.columns else None

    # ── Sélectionner colonnes Gold ───────────────────────────────────────
    gold_cols = [
        "IPP","Nom_Complet","Age","Sexe","CIN","Groupe_Sanguin",
        "Antecedents","Etablissement","Type_Etab","Ville",
        "Date_Arrivee","Date_Sortie","Niveau_Triage","Motif_Consultation",
        "Orientation","Duree_Sejour_min","Nb_Medecins_Dispo","Nb_Lits_Dispo",
        "Jour_Ferie","Saison","Heure_Arrivee","Jour_Semaine","Mois","Annee",
        "Tranche_Horaire","Nom_Jour","Groupe_Age","Est_Pic",
        "Mutuelle","Prix_Sejour","Prix_Soins",
    ]
    df_gold = df[[c for c in gold_cols if c in df.columns]].copy()

    # Sauvegarde CSV Gold
    out_csv = os.path.join(GOLD_DIR, "urgences_gold_processed.csv")
    df_gold.to_csv(out_csv, index=False, encoding="utf-8-sig")
    logger.log(f"  Gold CSV sauvegardé : {out_csv}")

    # ── Écriture MySQL ───────────────────────────────────────────────────
    if mode == "full":
        # Remplacer entièrement la table (garde les admissions manuelles récentes)
        # On préserve les 30 derniers jours d'admissions manuelles
        preserved = pd.DataFrame()
        try:
            with engine.connect() as conn:
                preserved = pd.read_sql(
                    text("SELECT * FROM urgences WHERE Date_Arrivee >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
                    conn
                )
            logger.log(f"  Admissions manuelles préservées : {len(preserved):,} lignes")
        except Exception:
            pass

        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE urgences"))
        logger.log("  Table urgences vidée (mode full)")

        df_gold.to_sql("urgences", engine, if_exists="append", index=False,
                       method="multi", chunksize=2000)
        inserted = len(df_gold)

        # Réinsérer les admissions manuelles qui ne seraient pas dans le CSV
        if not preserved.empty:
            manual_ipps = set(preserved["IPP"].astype(str))
            csv_ipps    = set(df_gold["IPP"].astype(str))
            to_reinsert = preserved[~preserved["IPP"].astype(str).isin(csv_ipps)]
            if not to_reinsert.empty:
                to_reinsert.to_sql("urgences", engine, if_exists="append", index=False,
                                   method="multi", chunksize=500)
                logger.log(f"  Admissions manuelles réinsérées : {len(to_reinsert):,}")

    else:
        # Incremental : insérer seulement les IPP absents
        with engine.connect() as conn:
            existing = pd.read_sql(text("SELECT DISTINCT IPP FROM urgences"), conn)
        existing_ids = set(existing["IPP"].astype(str))
        df_new = df_gold[~df_gold["IPP"].astype(str).isin(existing_ids)]
        inserted = len(df_new)
        if inserted > 0:
            df_new.to_sql("urgences", engine, if_exists="append", index=False,
                          method="multi", chunksize=2000)

    logger.log(f"  Gold MySQL : {inserted:,} lignes insérées en mode '{mode}'")
    return {"inserted": inserted, "total": len(df_gold)}


# ════════════════════════════════════════════════════════════════════════════
# PIPELINE COMPLET
# ════════════════════════════════════════════════════════════════════════════
def run_pipeline(database_url: str, mode: str = "incremental") -> dict:
    """
    Lance le pipeline complet : Bronze → Silver → Gold → MySQL.
    Retourne un rapport de synthèse.
    """
    logger = ETLLogger()
    start  = datetime.now()
    logger.log("═" * 60)
    logger.log(f"PIPELINE ETL DÉMARRÉ — mode={mode}")
    logger.log("═" * 60)

    report = {
        "status":    "error",
        "started_at": start.isoformat(),
        "mode":       mode,
        "bronze": {}, "silver": {}, "gold": {},
        "errors": [],
    }

    try:
        # Connexion MySQL
        eng = create_engine(database_url, pool_pre_ping=True,
                            connect_args={"connect_timeout": 30})

        # Bronze
        df_bronze = step_bronze(logger)
        report["bronze"] = {"rows": len(df_bronze)}

        # Silver
        df_silver = step_silver(df_bronze, logger)
        report["silver"] = {
            "rows":     len(df_silver),
            "dropped":  len(df_bronze) - len(df_silver),
        }

        # Gold → MySQL
        gold_result = step_gold(df_silver, eng, logger, mode=mode)
        report["gold"] = gold_result

        elapsed = (datetime.now() - start).total_seconds()
        report["status"]     = "success"
        report["elapsed_s"]  = round(elapsed, 1)
        logger.log(f"PIPELINE TERMINÉ en {elapsed:.1f}s")

    except Exception as e:
        import traceback
        err = traceback.format_exc()
        logger.log(f"ERREUR PIPELINE : {err}")
        report["errors"].append(str(e))
        report["status"] = "error"

    logger.flush()
    return report


# ── Exécution standalone ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "incremental"
    db   = os.environ.get("DATABASE_URL",
                          "mysql+pymysql://root:@127.0.0.1:3306/chu_ibnsina")
    result = run_pipeline(db, mode=mode)
    print("\nRapport :", result)
