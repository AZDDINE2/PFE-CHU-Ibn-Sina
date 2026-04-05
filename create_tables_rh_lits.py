"""
Création et peuplement des tables :
  - personnel       : ressources humaines par établissement
  - lits            : lits par établissement avec statut temps réel
"""
import os, random, datetime
from sqlalchemy import create_engine, text

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "chu.db")
engine  = create_engine(f"sqlite:///{DB_PATH}")

# ── Référentiels ──────────────────────────────────────────────
ETABLISSEMENTS = [
    {"nom": "Hopital Ibn Sina",       "capacite": 500, "medecins": 320, "urgentistes": 45},
    {"nom": "Hopital des Enfants",    "capacite": 200, "medecins":  95, "urgentistes": 18},
    {"nom": "Hopital Al Ayachi",      "capacite": 250, "medecins": 140, "urgentistes": 28},
    {"nom": "Hopital Ar-Razi",        "capacite": 150, "medecins":  60, "urgentistes":  8},
    {"nom": "Hopital des Specialites","capacite": 300, "medecins": 180, "urgentistes": 22},
    {"nom": "Hopital de Maternite et de Sante Reproductrice les Orangers",
                                      "capacite": 180, "medecins":  75, "urgentistes": 12},
    {"nom": "Hopital Moulay Youssef", "capacite": 200, "medecins":  88, "urgentistes": 15},
    {"nom": "Hopital de Maternite Souissi", "capacite": 160, "medecins": 65, "urgentistes": 10},
    {"nom": "CHU Ibn Sina",           "capacite": 600, "medecins": 400, "urgentistes": 60},
]

PRENOMS_M = ["Mohamed","Ahmed","Youssef","Omar","Hassan","Khalid","Rachid","Karim","Hamid","Tarik",
             "Nabil","Samir","Hicham","Mehdi","Amine","Driss","Fouad","Jamal","Aziz","Mustapha"]
PRENOMS_F = ["Fatima","Aicha","Khadija","Meryem","Leila","Nadia","Sara","Zineb","Houda","Samira",
             "Hafsa","Rajae","Imane","Layla","Soumia","Naima","Widad","Bouchra","Ilham","Ghita"]
NOMS      = ["Benali","El Mansouri","Cherkaoui","Alaoui","Bensouda","El Fassi","Chraibi","Berrada",
             "Tahiri","Kettani","Benhaddou","El Idrissi","Lahlou","Bennani","Belkhadir","Tazi",
             "El Amrani","Guessous","Benkirane","El Harti","Zouiten","Filali","Sefrioui","Rhazali"]

ROLES_MEDECIN = [
    "Médecin urgentiste","Chef de service","Médecin résident","Interne","Médecin spécialiste",
]
ROLES_INFIRMIER = [
    "Infirmier urgentiste","Infirmier chef","Infirmier anesthésiste","Aide-soignant","Infirmier de garde",
]
SPECIALITES_MED = ["Médecine d'urgence","Cardiologie","Traumatologie","Pédiatrie",
                   "Neurologie","Chirurgie générale","Anesthésie-réanimation","Médecine interne"]
STATUTS_PERS    = ["En service","En service","En service","En garde","En congé","Repos"]

SERVICES = ["Urgences","Réanimation","Chirurgie","Médecine interne","Observation","Pédiatrie","Maternité"]
TYPES_LIT = ["Standard","Réanimation","Isolement","Observation","Post-opératoire"]
STATUTS_LIT = ["Disponible","Disponible","Disponible","Occupé","En maintenance"]


def rand_nom(sexe):
    if sexe == "M":
        return f"Dr. {random.choice(PRENOMS_M)} {random.choice(NOMS)}"
    return f"Dr. {random.choice(PRENOMS_F)} {random.choice(NOMS)}"

def rand_infirmier(sexe):
    if sexe == "M":
        return f"{random.choice(PRENOMS_M)} {random.choice(NOMS)}"
    return f"{random.choice(PRENOMS_F)} {random.choice(NOMS)}"

def rand_tel():
    return f"06{random.randint(10,99)}{random.randint(100000,999999)}"

def rand_date_embauche():
    year  = random.randint(2005, 2022)
    month = random.randint(1, 12)
    day   = random.randint(1, 28)
    return f"{year}-{month:02d}-{day:02d}"

def rand_matricule(etab_idx, idx):
    return f"CHU-{etab_idx:02d}-{idx:04d}"


with engine.connect() as conn:
    # ══════════════════════════════════════════════════════════
    # TABLE personnel
    # ══════════════════════════════════════════════════════════
    conn.execute(text("DROP TABLE IF EXISTS personnel"))
    conn.execute(text("""
        CREATE TABLE personnel (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            matricule       TEXT UNIQUE,
            etablissement   TEXT NOT NULL,
            nom_complet     TEXT NOT NULL,
            sexe            TEXT,
            role            TEXT NOT NULL,
            specialite      TEXT DEFAULT '',
            statut          TEXT DEFAULT 'En service',
            telephone       TEXT DEFAULT '',
            email           TEXT DEFAULT '',
            date_embauche   TEXT DEFAULT '',
            updated_at      TEXT DEFAULT ''
        )
    """))

    personnel_rows = []
    idx = 1
    for ei, etab in enumerate(ETABLISSEMENTS):
        nb_med = min(etab["urgentistes"], 30)   # limité pour démo
        nb_inf = nb_med * 2

        # Médecins
        for _ in range(nb_med):
            sexe = random.choice(["M","F"])
            personnel_rows.append({
                "matricule":     rand_matricule(ei+1, idx),
                "etablissement": etab["nom"],
                "nom_complet":   rand_nom(sexe),
                "sexe":          sexe,
                "role":          random.choice(ROLES_MEDECIN),
                "specialite":    random.choice(SPECIALITES_MED),
                "statut":        random.choice(STATUTS_PERS),
                "telephone":     rand_tel(),
                "email":         f"medecin{idx}@chu-ibnsina.ma",
                "date_embauche": rand_date_embauche(),
                "updated_at":    datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
            idx += 1

        # Infirmiers
        for _ in range(nb_inf):
            sexe = random.choice(["M","F"])
            personnel_rows.append({
                "matricule":     rand_matricule(ei+1, idx),
                "etablissement": etab["nom"],
                "nom_complet":   rand_infirmier(sexe),
                "sexe":          sexe,
                "role":          random.choice(ROLES_INFIRMIER),
                "specialite":    "Soins infirmiers",
                "statut":        random.choice(STATUTS_PERS),
                "telephone":     rand_tel(),
                "email":         f"infirmier{idx}@chu-ibnsina.ma",
                "date_embauche": rand_date_embauche(),
                "updated_at":    datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })
            idx += 1

    for row in personnel_rows:
        conn.execute(text("""
            INSERT INTO personnel
              (matricule, etablissement, nom_complet, sexe, role, specialite,
               statut, telephone, email, date_embauche, updated_at)
            VALUES
              (:matricule,:etablissement,:nom_complet,:sexe,:role,:specialite,
               :statut,:telephone,:email,:date_embauche,:updated_at)
        """), row)

    print(f"✓ personnel : {len(personnel_rows)} membres du personnel insérés")

    # ══════════════════════════════════════════════════════════
    # TABLE lits
    # ══════════════════════════════════════════════════════════
    conn.execute(text("DROP TABLE IF EXISTS lits"))
    conn.execute(text("""
        CREATE TABLE lits (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            etablissement   TEXT NOT NULL,
            numero_lit      TEXT NOT NULL,
            service         TEXT DEFAULT 'Urgences',
            type_lit        TEXT DEFAULT 'Standard',
            statut          TEXT DEFAULT 'Disponible',
            id_patient      TEXT DEFAULT '',
            nom_patient     TEXT DEFAULT '',
            date_admission  TEXT DEFAULT '',
            updated_at      TEXT DEFAULT '',
            UNIQUE(etablissement, numero_lit)
        )
    """))

    lits_rows = []
    for etab in ETABLISSEMENTS:
        capacite = etab["capacite"]
        sections = ["A","B","C","D","E"] if capacite > 200 else ["A","B","C"]
        par_section = capacite // len(sections)

        for si, section in enumerate(sections):
            service = SERVICES[si % len(SERVICES)]
            for num in range(1, par_section + 1):
                statut   = random.choice(STATUTS_LIT)
                type_lit = random.choice(TYPES_LIT) if service == "Réanimation" else "Standard"
                lits_rows.append({
                    "etablissement": etab["nom"],
                    "numero_lit":    f"{section}-{num:02d}",
                    "service":       service,
                    "type_lit":      type_lit,
                    "statut":        statut,
                    "id_patient":    "",
                    "nom_patient":   "",
                    "date_admission":"",
                    "updated_at":    datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                })

    for row in lits_rows:
        conn.execute(text("""
            INSERT OR IGNORE INTO lits
              (etablissement, numero_lit, service, type_lit, statut,
               id_patient, nom_patient, date_admission, updated_at)
            VALUES
              (:etablissement,:numero_lit,:service,:type_lit,:statut,
               :id_patient,:nom_patient,:date_admission,:updated_at)
        """), row)

    conn.commit()
    print(f"✓ lits      : {len(lits_rows)} lits insérés")

    # ── Résumé ────────────────────────────────────────────────
    with engine.connect() as conn2:
        for table in ["personnel","lits"]:
            cnt = conn2.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  → {table} : {cnt} lignes en base")

print("\nDone ! Tables créées avec succès.")
