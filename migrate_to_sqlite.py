"""
Migration via pg_dump CSV → SQLite
"""
import os
import pandas as pd
from sqlalchemy import create_engine
import subprocess

SQ_URL = "sqlite:///data/chu.db"
sq     = create_engine(SQ_URL)

tables = ["urgences", "urgences_bronze", "soins", "soins_bronze", "etablissements"]

print("Export PostgreSQL via Docker...")
for table in tables:
    try:
        # Export CSV depuis PostgreSQL via docker exec
        result = subprocess.run(
            ["docker", "exec", "pg_temp", "psql",
             "-U", "chu_admin", "-d", "chu_urgences",
             "-c", f"\\COPY \"{table}\" TO STDOUT WITH CSV HEADER ENCODING 'UTF8'"],
            capture_output=True
        )
        if result.returncode != 0:
            print(f"  ✗ {table} — {result.stderr.decode('utf-8', errors='replace')}")
            continue

        from io import StringIO
        csv_data = result.stdout.decode('utf-8', errors='replace')
        df = pd.read_csv(StringIO(csv_data))
        df.to_sql(table, sq, if_exists="replace", index=False)
        print(f"  ✓ {table} — {len(df)} lignes")
    except Exception as e:
        print(f"  ✗ {table} — {e}")

print("\nMigration terminée → data/chu.db")
