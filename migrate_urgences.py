import pandas as pd
from sqlalchemy import create_engine
from io import StringIO
import subprocess

sq = create_engine("sqlite:///data/chu.db")

print("Export urgences...")
result = subprocess.run(
    ["docker", "exec", "pg_temp", "psql",
     "-U", "chu_admin", "-d", "chu_urgences",
     "-c", '\\COPY "urgences" TO STDOUT WITH CSV HEADER ENCODING \'UTF8\''],
    capture_output=True
)
if result.returncode != 0:
    print("Erreur:", result.stderr.decode('utf-8', errors='replace'))
else:
    csv_data = result.stdout.decode('utf-8', errors='replace')
    df = pd.read_csv(StringIO(csv_data), low_memory=False)
    df.to_sql("urgences", sq, if_exists="replace", index=False)
    print(f"✓ urgences — {len(df)} lignes")
    print("Restart backend:")
    subprocess.run(["docker", "restart", "chu_backend"])
    print("Done!")
