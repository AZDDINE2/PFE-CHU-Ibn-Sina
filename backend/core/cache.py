"""
core/cache.py — Sauvegarde/chargement du cache Parquet et comptage DB.
"""
import pandas as pd

from core.database import engine, CACHE_URG, CACHE_SOINS
from sqlalchemy import text

__all__ = ["_save_cache", "_load_cache", "_db_count", "CACHE_URG", "CACHE_SOINS"]


def _save_cache(df: pd.DataFrame, path: str):
    """Sauvegarde un DataFrame en Parquet (cache local)."""
    try:
        df.to_parquet(path, index=False)
    except Exception as e:
        print(f"Cache save warning ({path}): {e}")


def _load_cache(path: str) -> pd.DataFrame:
    """Charge un DataFrame depuis le cache Parquet. Retourne DataFrame vide si absent."""
    try:
        return pd.read_parquet(path)
    except Exception:
        return pd.DataFrame()


def _db_count(table: str, where: str = "") -> int:
    """Nombre de lignes dans une table (rapide)."""
    try:
        q = f'SELECT COUNT(*) FROM {table}'
        if where:
            q += f' WHERE {where}'
        with engine.connect() as conn:
            return int(conn.execute(text(q)).scalar() or 0)
    except Exception:
        return -1
