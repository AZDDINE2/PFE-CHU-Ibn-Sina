"""
core/database.py — SQLAlchemy engine, chemins, et dictionnaire de données global.
"""
import os
import sqlite3

from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# ── Chemins ──────────────────────────────────────────────────────────────────
ROOT        = os.environ.get('DATA_ROOT', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
GOLD        = os.path.join(ROOT, 'data', 'gold')
MODELS      = os.path.join(ROOT, 'models')
CACHE_DIR   = os.path.join(ROOT, 'data', 'cache')
CACHE_URG   = os.path.join(CACHE_DIR, 'urgences.parquet')
CACHE_SOINS = os.path.join(CACHE_DIR, 'soins.parquet')
os.makedirs(CACHE_DIR, exist_ok=True)

# ── Base de données ───────────────────────────────────────────────────────────
_default_db  = f"sqlite:///{os.path.join(ROOT, 'data', 'chu.db')}"
DATABASE_URL = os.environ.get('DATABASE_URL', _default_db)

IS_MYSQL  = DATABASE_URL.startswith("mysql")
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# SQLAlchemy engine
engine = None
try:
    if IS_SQLITE:
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False, "timeout": 30},
            poolclass=NullPool,
        )
        with engine.connect() as _c:
            _c.execute(text("PRAGMA journal_mode=WAL"))
            _c.execute(text("PRAGMA synchronous=NORMAL"))
    elif IS_MYSQL:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args={"connect_timeout": 30},
        )
    else:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    db_type = "SQLite" if IS_SQLITE else "MySQL" if IS_MYSQL else "PostgreSQL"
    print(f"{db_type} connecté : {DATABASE_URL}")
except Exception as e:
    print(f"Base de données non disponible : {e} — mode CSV de secours")

# ── Singleton de données en mémoire ──────────────────────────────────────────
data: dict = {}
