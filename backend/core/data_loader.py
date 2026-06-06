"""
core/data_loader.py — Chargement et rechargement des données en mémoire.
"""
import os
import sqlite3

import pandas as pd
import joblib
from sqlalchemy import text

from core.database import (
    engine, IS_SQLITE, IS_MYSQL, DATABASE_URL,
    data, GOLD, MODELS, CACHE_URG, CACHE_SOINS,
)
from core.cache import _save_cache, _load_cache, _db_count


def get_urg() -> pd.DataFrame:
    """Lire depuis le cache mémoire. Ne jamais appeler reload_urg() en synchrone depuis HTTP."""
    df = data.get("urg", pd.DataFrame())
    if not df.empty and not pd.api.types.is_datetime64_any_dtype(df["Date_Arrivee"]):
        df["Date_Arrivee"] = pd.to_datetime(df["Date_Arrivee"], errors="coerce", format="mixed")
    return df


def get_soins() -> pd.DataFrame:
    """Lire soins depuis le cache mémoire."""
    return data.get("soins", pd.DataFrame())


def reload_urg():
    """Recharge TOUTES les données urgences depuis la base en mémoire."""
    if engine:
        if IS_SQLITE:
            db_path = DATABASE_URL.replace("sqlite:////", "/").replace("sqlite:///", "")
            conn_lite = sqlite3.connect(db_path, timeout=120)
            conn_lite.execute("PRAGMA wal_checkpoint(PASSIVE)")
            df = pd.read_sql_query('SELECT * FROM urgences WHERE Annee IS NOT NULL', conn_lite)
            conn_lite.close()
        else:
            with engine.connect() as conn:
                df = pd.read_sql_query(
                    text('SELECT * FROM urgences WHERE Annee IS NOT NULL'),
                    conn
                )
        df["Date_Arrivee"] = pd.to_datetime(df["Date_Arrivee"], errors="coerce", format="mixed")
        if "Date_Sortie" in df.columns:
            df["Date_Sortie"] = pd.to_datetime(df["Date_Sortie"], errors="coerce", format="mixed")
        data["urg"] = df
        _save_cache(df, CACHE_URG)
        print(f"Urgences chargées : {len(df):,} lignes → cache mis à jour")


def _read_table(table: str) -> pd.DataFrame:
    """Lit une table depuis SQLite (direct) ou MySQL/PG (SQLAlchemy)."""
    if IS_SQLITE:
        db_path = DATABASE_URL.replace("sqlite:////", "/").replace("sqlite:///", "")
        conn_lite = sqlite3.connect(db_path, timeout=120)
        df = pd.read_sql_query(f'SELECT * FROM {table}', conn_lite)
        conn_lite.close()
        return df
    elif engine:
        with engine.connect() as conn:
            return pd.read_sql_query(text(f'SELECT * FROM {table}'), conn)
    return pd.DataFrame()


def _do_load_data():
    """Logique complète de chargement. Chaque étape est isolée : une erreur DB
    n'empêche jamais le chargement depuis le cache Parquet."""

    # ── ÉTAPE 1 : Init tables DB (non bloquant) ──────────────────────────
    try:
        if IS_SQLITE:
            db_path = DATABASE_URL.replace("sqlite:////", "/").replace("sqlite:///", "")
            _c = sqlite3.connect(db_path, timeout=30)
            _c.execute("PRAGMA journal_mode=WAL")
            _c.execute("PRAGMA synchronous=NORMAL")
            _c.executescript("""
                CREATE TABLE IF NOT EXISTS urgences_bronze (
                    IPP INTEGER PRIMARY KEY AUTOINCREMENT,
                    etablissement TEXT, orientation TEXT, niveau_triage TEXT
                );
                CREATE TABLE IF NOT EXISTS soins_bronze (
                    id_soin INTEGER PRIMARY KEY AUTOINCREMENT,
                    type_soin TEXT, cout FLOAT
                );
            """)
            _c.commit()
            _c.close()
        elif IS_MYSQL and engine:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS urgences_bronze (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        etablissement TEXT, orientation TEXT, niveau_triage TEXT
                    )
                """))
        print("Tables initialisées.")
    except Exception as e:
        print(f"Init tables (non bloquant) : {e}")

    # ── ÉTAPE 2 : Charger urgences (cache en priorité, DB en secours) ────
    try:
        cache_urg = _load_cache(CACHE_URG)
        if not cache_urg.empty:
            db_n = _db_count("urgences", "Annee IS NOT NULL")
            if db_n > 0 and db_n > len(cache_urg):
                print(f"Cache obsolète ({len(cache_urg):,} vs {db_n:,} en DB) → rechargement...")
                reload_urg()
            else:
                cache_urg["Date_Arrivee"] = pd.to_datetime(cache_urg["Date_Arrivee"], errors="coerce")
                if "Date_Sortie" in cache_urg.columns:
                    cache_urg["Date_Sortie"] = pd.to_datetime(cache_urg["Date_Sortie"], errors="coerce")
                data["urg"] = cache_urg
                print(f"Urgences depuis cache : {len(cache_urg):,} lignes (démarrage rapide)")
        else:
            print("Pas de cache — chargement depuis la base...")
            reload_urg()
    except Exception as e:
        print(f"Erreur chargement urgences : {e}")
        data.setdefault("urg", pd.DataFrame())

    # ── ÉTAPE 3 : Charger soins (cache en priorité) ──────────────────────
    try:
        cache_soins = _load_cache(CACHE_SOINS)
        if not cache_soins.empty:
            db_s = _db_count("soins", "")
            if db_s > 0 and db_s > len(cache_soins):
                data["soins"] = _read_table("soins")
                _save_cache(data["soins"], CACHE_SOINS)
                print(f"Soins rechargés : {len(data['soins']):,} lignes")
            else:
                data["soins"] = cache_soins
                print(f"Soins depuis cache : {len(cache_soins):,} lignes (démarrage rapide)")
        elif engine:
            data["soins"] = _read_table("soins")
            _save_cache(data["soins"], CACHE_SOINS)
            print(f"Soins chargés : {len(data['soins']):,} lignes")
        else:
            data["soins"] = pd.DataFrame()
    except Exception as e:
        print(f"Erreur chargement soins : {e}")
        data.setdefault("soins", pd.DataFrame())

    # ── ÉTAPE 4 : Charger établissements ─────────────────────────────────
    try:
        data["etab"] = _read_table("etablissements")
    except Exception:
        data.setdefault("etab", pd.DataFrame())

    # ── ÉTAPE 5 : Fichiers CSV optionnels ────────────────────────────────
    for key, path in [
        ("ts",      os.path.join(GOLD,   "serie_temporelle_daily.csv")),
        ("pred30",  os.path.join(GOLD,   "predictions_30jours.csv")),
        ("metrics", os.path.join(MODELS, "metrics_comparison.csv")),
    ]:
        try:
            data[key] = pd.read_csv(path, encoding="utf-8-sig")
        except Exception:
            data[key] = pd.DataFrame()

    # ── ÉTAPE 6 : Modèles ML ─────────────────────────────────────────────
    for key, path in [
        ("xgb", os.path.join(MODELS, "xgboost_model.pkl")),
        ("rf",  os.path.join(MODELS, "random_forest_model.pkl")),
        ("le",  os.path.join(MODELS, "label_encoder.pkl")),
    ]:
        try:
            data[key] = joblib.load(path)
        except Exception:
            data[key] = None

    # ── ÉTAPE 7 : Tables temps réel (non bloquant) ───────────────────────
    try:
        from core.auth import _init_users_table
        _init_users_table()
    except Exception as e:
        print(f"Init users (non bloquant) : {e}")

    try:
        if engine:
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS patient_statuts (
                        IPP VARCHAR(50) PRIMARY KEY,
                        statut TEXT NOT NULL,
                        lit_numero TEXT DEFAULT '',
                        updated_at TEXT,
                        updated_by TEXT
                    )
                """))
                try:
                    conn.execute(text("ALTER TABLE patient_statuts ADD COLUMN lit_numero TEXT DEFAULT ''"))
                except Exception:
                    pass
                conn.commit()
    except Exception as e:
        print(f"Init patient_statuts (non bloquant) : {e}")

    urg_n = len(data.get("urg", pd.DataFrame()))
    print(f"Chargement terminé — urgences: {urg_n:,} lignes")


def _load_data_background():
    """Charge toutes les données en arrière-plan (appelé dans un thread)."""
    try:
        _do_load_data()
    except Exception as e:
        print(f"ERREUR chargement background : {e}")
