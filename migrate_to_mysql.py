"""
Migration SQLite -> MySQL (XAMPP phpMyAdmin)
CHU Ibn Sina -- PFE 2024/2025

Usage:
    python migrate_to_mysql.py

Prerequis:
    - XAMPP demarre (Apache + MySQL)
    - pymysql installe : pip install pymysql sqlalchemy
    - La base 'chu_ibnsina' sera creee automatiquement
"""

import sqlite3
import pymysql
import pandas as pd
from sqlalchemy import create_engine, text
import os, sys

# ── Configuration ────────────────────────────────────────────────────────────
SQLITE_PATH = r"C:\Users\Azddine\Desktop\PFE\data\chu.db"

MYSQL_HOST  = "127.0.0.1"
MYSQL_PORT  = 3306
MYSQL_USER  = "root"
MYSQL_PASS  = ""          # vide par defaut dans XAMPP
MYSQL_DB    = "chu_ibnsina"

CHUNK_SIZE  = 10_000      # lignes par batch pour les grandes tables

# Tables a migrer avec leur cle primaire (None = auto)
TABLES = [
    ("urgences",           None),
    ("soins",              "id_soin"),
    ("etablissements",     None),
    ("users",              "username"),
    ("personnel",          "id"),
    ("lits",               "id"),
    ("patient_statuts",    "IPP"),
]

# ── Connexions ───────────────────────────────────────────────────────────────
print("=" * 60)
print("Migration SQLite -> MySQL -- CHU Ibn Sina")
print("=" * 60)

if not os.path.exists(SQLITE_PATH):
    print(f"ERREUR : fichier SQLite introuvable : {SQLITE_PATH}")
    sys.exit(1)

# Creer la base MySQL si elle n'existe pas
print(f"\n[1/5] Connexion a MySQL ({MYSQL_HOST}:{MYSQL_PORT})...")
try:
    raw = pymysql.connect(
        host=MYSQL_HOST, port=MYSQL_PORT,
        user=MYSQL_USER, password=MYSQL_PASS,
        charset="utf8mb4",
    )
    with raw.cursor() as cur:
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
    raw.commit()
    raw.close()
    print(f"  Base '{MYSQL_DB}' prete.")
except Exception as e:
    print(f"ERREUR connexion MySQL : {e}")
    print("Verifiez que XAMPP MySQL est demarre et que les identifiants sont corrects.")
    sys.exit(1)

MYSQL_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASS}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}?charset=utf8mb4"
)
mysql_engine = create_engine(MYSQL_URL, pool_pre_ping=True, pool_recycle=3600)
sqlite_conn  = sqlite3.connect(SQLITE_PATH, timeout=120)
print(f"  SQLite ouvert : {SQLITE_PATH}")


# ── Verifier quelles tables existent dans SQLite ─────────────────────────────
sqlite_tables = {
    r[0] for r in sqlite_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()
}


# ── Fonction de migration dynamique ─────────────────────────────────────────
def migrate_table(table_name: str, pk_col: str = None):
    if table_name not in sqlite_tables:
        print(f"  [{table_name}] absente dans SQLite -- ignoree.")
        return

    total = sqlite_conn.execute(f"SELECT COUNT(*) FROM `{table_name}`").fetchone()[0]
    print(f"\n  [{table_name}]  {total:,} lignes...")

    if total == 0:
        print(f"  [{table_name}] vide -- ignoree.")
        return

    offset    = 0
    imported  = 0
    first     = True

    while offset < total:
        df = pd.read_sql_query(
            f"SELECT * FROM `{table_name}` LIMIT {CHUNK_SIZE} OFFSET {offset}",
            sqlite_conn
        )
        if df.empty:
            break

        # Remplacer NaN/inf par None
        df = df.where(pd.notnull(df), None)

        mode = "replace" if first else "append"
        first = False

        try:
            df.to_sql(
                table_name, mysql_engine,
                if_exists=mode, index=False,
                method="multi", chunksize=500
            )
        except Exception as e:
            print(f"  ERREUR batch offset={offset} : {e}")
            # Continuer avec les autres batches
            offset += CHUNK_SIZE
            continue

        imported += len(df)
        offset   += CHUNK_SIZE
        pct = imported / total * 100
        print(f"  {imported:>10,} / {total:,}  ({pct:.1f}%)", end="\r")

    print(f"  {imported:>10,} lignes importees.          ")

    # Ajouter la cle primaire si specifiee
    if pk_col:
        try:
            with mysql_engine.begin() as conn:
                # Verifier le type de la colonne
                dtype_row = conn.execute(
                    text(f"SELECT DATA_TYPE FROM information_schema.COLUMNS "
                         f"WHERE TABLE_SCHEMA='{MYSQL_DB}' AND TABLE_NAME='{table_name}' "
                         f"AND COLUMN_NAME='{pk_col}'")
                ).fetchone()
                if dtype_row:
                    dtype = dtype_row[0].upper()
                    # TEXT ne peut pas etre PK sans longueur en MySQL
                    if "TEXT" in dtype or "BLOB" in dtype:
                        conn.execute(text(
                            f"ALTER TABLE `{table_name}` "
                            f"MODIFY COLUMN `{pk_col}` VARCHAR(255)"
                        ))
                    conn.execute(text(
                        f"ALTER TABLE `{table_name}` ADD PRIMARY KEY (`{pk_col}`)"
                    ))
                    print(f"  Cle primaire ajoutee : {pk_col}")
        except Exception as e:
            print(f"  Avertissement PK : {e}")


# ── Migration ─────────────────────────────────────────────────────────────────
print("\n[2/5] Migration des donnees...")
for table, pk in TABLES:
    migrate_table(table, pk)


# ── Ajouter les index importants pour les performances ───────────────────────
print("\n[3/5] Ajout des index de performance...")
INDEXES = [
    ("urgences",   "Annee"),
    ("urgences",   "Date_Arrivee"),
    ("urgences",   "IPP"),
    ("soins",      "IPP"),
    ("soins",      "Date_Soin"),
]
with mysql_engine.begin() as conn:
    for table, col in INDEXES:
        idx_name = f"idx_{table}_{col}"
        try:
            conn.execute(text(
                f"ALTER TABLE `{table}` ADD INDEX `{idx_name}` (`{col}`)"
            ))
            print(f"  Index cree : {table}.{col}")
        except Exception as e:
            print(f"  Index {idx_name} : {e}")


# ── Verification ─────────────────────────────────────────────────────────────
print("\n[4/5] Verification des comptages...")
with mysql_engine.connect() as conn:
    for table, _ in TABLES:
        if table not in sqlite_tables:
            continue
        try:
            n_mysql  = conn.execute(text(f"SELECT COUNT(*) FROM `{table}`")).scalar()
            n_sqlite = sqlite_conn.execute(f"SELECT COUNT(*) FROM `{table}`").fetchone()[0]
            status   = "OK" if n_mysql == n_sqlite else "DIFFERENT !"
            print(f"  {table:<25}  SQLite={n_sqlite:>8,}  MySQL={n_mysql:>8,}  [{status}]")
        except Exception as e:
            print(f"  {table:<25}  erreur : {e}")


# ── Nettoyage ────────────────────────────────────────────────────────────────
sqlite_conn.close()

# ── Resultat ─────────────────────────────────────────────────────────────────
print("\n[5/5] Migration terminee !")
print("\nMettez a jour votre fichier .env avec :")
print(f"  # Local (sans Docker) :")
print(f"  DATABASE_URL=mysql+pymysql://{MYSQL_USER}:{MYSQL_PASS}@127.0.0.1:{MYSQL_PORT}/{MYSQL_DB}")
print(f"\n  # Docker (host.docker.internal) :")
print(f"  DATABASE_URL=mysql+pymysql://{MYSQL_USER}:{MYSQL_PASS}@host.docker.internal:{MYSQL_PORT}/{MYSQL_DB}")
print("=" * 60)
