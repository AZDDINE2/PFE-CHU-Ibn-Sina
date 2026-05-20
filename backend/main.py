"""
Backend FastAPI — CHU Ibn Sina Rabat
PFE BI & Data Science — Azddine 2024/2025
"""
import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Core ──────────────────────────────────────────────────────────────────────
from core.database import engine, IS_SQLITE
from core.auth import _init_users_table
from core.data_loader import _load_data_background
from sqlalchemy import text

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.auth          import router as auth_router
from routers.dashboard     import router as dashboard_router
from routers.urgences      import router as urgences_router
from routers.patients      import router as patients_router
from routers.soins         import router as soins_router
from routers.ressources    import router as ressources_router
from routers.etablissements import router as etablissements_router
from routers.predictions   import router as predictions_router
from routers.alertes       import router as alertes_router
from routers.export        import router as export_router
from routers.pipeline      import router as pipeline_router
from routers.users         import router as users_router

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="CHU Ibn Sina API", version="1.0.0")

_cors_origins = os.environ.get("CORS_ORIGINS", "*")
_origins      = ["*"] if _cors_origins == "*" else _cors_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_cors_origins != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(urgences_router)
app.include_router(patients_router)
app.include_router(soins_router)
app.include_router(ressources_router)
app.include_router(etablissements_router)
app.include_router(predictions_router)
app.include_router(alertes_router)
app.include_router(export_router)
app.include_router(pipeline_router)
app.include_router(users_router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def load_data():
    """Démarre le chargement des données dans un thread background."""
    try:
        if engine:
            if IS_SQLITE:
                with engine.connect() as conn:
                    conn.execute(text("PRAGMA journal_mode=WAL"))
                    conn.execute(text("PRAGMA synchronous=NORMAL"))
            _init_users_table()
    except Exception as e:
        print(f"Init DB erreur : {e}")
    t = threading.Thread(target=_load_data_background, daemon=True)
    t.start()
    print("Chargement des données démarré en arrière-plan...")


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "CHU Ibn Sina API", "docs": "/docs"}
