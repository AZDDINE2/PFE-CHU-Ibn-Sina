"""
ETL Complet — CHU Ibn Sina Rabat
Bronze → Silver → Gold + Feature Engineering
PFE BI & Data Science — Azddine 2024/2025
"""

import pandas as pd
import numpy as np
import os
import logging
from datetime import datetime

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
ROOT = r'C:\Users\Azddine\Desktop\PFE'

BRONZE = os.path.join(ROOT, 'data', 'bronze')
SILVER = os.path.join(ROOT, 'data', 'silver')
GOLD   = os.path.join(ROOT, 'data', 'gold')
LOGS   = os.path.join(ROOT, 'data', 'logs')

for d in [SILVER, GOLD, LOGS]:
    os.makedirs(d, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(LOGS, 'etl.log'),
    level=logging.INFO,
    format='%(asctime)s — %(levelname)s — %(message)s',
    encoding='utf-8'
)
log = logging.getLogger()
log.addHandler(logging.StreamHandler())

log.info("=" * 60)
log.info("ETL DEBUT : " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
log.info("=" * 60)


# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────
def lire_bronze(nom):
    path = os.path.join(BRONZE, nom)
    df = pd.read_csv(path, encoding='utf-8-sig', low_memory=False)
    df.columns = df.columns.str.strip().str.lower().str.replace('"', '')
    log.info(f"[BRONZE] {nom} : {len(df):,} lignes, {df.shape[1]} colonnes")
    return df

def sauver(df, dossier, nom):
    path = os.path.join(dossier, nom)
    df.to_csv(path, index=False, encoding='utf-8-sig')
    log.info(f"[SAVE] {nom} : {len(df):,} lignes → {path}")

def groupe_age(age):
    if   age < 15:  return 'Enfant'
    elif age < 25:  return 'Ado'
    elif age < 40:  return 'Adulte Jeune'
    elif age < 60:  return 'Adulte'
    else:           return 'Senior'

def tranche_horaire(h):
    if   6  <= h < 12: return 'Matin'
    elif 12 <= h < 18: return 'Après-midi'
    elif 18 <= h < 22: return 'Soir'
    else:              return 'Nuit'

JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']


# ═══════════════════════════════════════════════════════════
# ÉTAPE 1 — LECTURE BRONZE
# ═══════════════════════════════════════════════════════════
log.info("\n── ÉTAPE 1 : Lecture Bronze ──")

urg  = lire_bronze('urgences_BRONZE.csv')
soin = lire_bronze('soins_BRONZE.csv')
etab = lire_bronze('etablissements_BRONZE.csv')


# ═══════════════════════════════════════════════════════════
# ÉTAPE 2 — SILVER : Nettoyage
# ═══════════════════════════════════════════════════════════
log.info("\n── ÉTAPE 2 : Silver (nettoyage) ──")

# ── Urgences Silver ──────────────────────────────────────
u = urg.copy()

# Supprimer doublons
avant = len(u)
u = u.drop_duplicates(subset=['IPP'])
log.info(f"Urgences doublons supprimés : {avant - len(u)}")

# Dates
u['date_arrivee'] = pd.to_datetime(u['date_arrivee'], errors='coerce')
u['date_sortie']  = pd.to_datetime(u['date_sortie'],  errors='coerce')

# Supprimer lignes sans date
u = u.dropna(subset=['date_arrivee'])

# Corriger durée séjour négative ou aberrante
u['duree_sejour_min'] = pd.to_numeric(u['duree_sejour_min'], errors='coerce').fillna(0)
u.loc[u['duree_sejour_min'] < 0,    'duree_sejour_min'] = 0
u.loc[u['duree_sejour_min'] > 4320, 'duree_sejour_min'] = 4320  # max 3 jours

# Age
u['age'] = pd.to_numeric(u['age'], errors='coerce')
u = u.dropna(subset=['age'])
u['age'] = u['age'].astype(int)
u = u[(u['age'] >= 0) & (u['age'] <= 110)]

# Remplir valeurs manquantes
u['antecedents']       = u['antecedents'].fillna('Aucun')
u['groupe_sanguin']    = u['groupe_sanguin'].fillna('Inconnu')
u['nb_medecins_dispo'] = pd.to_numeric(u['nb_medecins_dispo'], errors='coerce').fillna(5).astype(int)
u['nb_lits_dispo']     = pd.to_numeric(u['nb_lits_dispo'],     errors='coerce').fillna(10).astype(int)
u['jour_ferie']        = pd.to_numeric(u['jour_ferie'],        errors='coerce').fillna(0).astype(int)

# Normaliser texte
u['sexe']       = u['sexe'].str.upper().str.strip()
u['orientation'] = u['orientation'].str.strip()
u['niveau_triage'] = u['niveau_triage'].str.strip()

log.info(f"Urgences Silver : {len(u):,} lignes")
sauver(u, SILVER, 'urgences_SILVER.csv')

# ── Soins Silver ─────────────────────────────────────────
s = soin.copy()

avant = len(s)
s = s.drop_duplicates(subset=['id_soin'])
log.info(f"Soins doublons supprimés : {avant - len(s)}")

s['cout_soin']     = pd.to_numeric(s['cout_soin'],     errors='coerce').fillna(0)
s['duree_soin_min']= pd.to_numeric(s['duree_soin_min'],errors='coerce').fillna(30)
s['date_soin']     = pd.to_datetime(s['date_soin'], errors='coerce')

s = s[s['cout_soin'] >= 0]
s['medicament']        = s['medicament'].fillna('Non spécifié')
s['medecin_responsable']= s['medecin_responsable'].fillna('Non assigné')
s['resultat']          = s['resultat'].fillna('Non renseigné')

log.info(f"Soins Silver : {len(s):,} lignes")
sauver(s, SILVER, 'soins_SILVER.csv')

# ── Etablissements Silver ────────────────────────────────
e = etab.copy()
e['capacite_lits']  = pd.to_numeric(e['capacite_lits'],  errors='coerce').fillna(0).astype(int)
e['nb_medecins']    = pd.to_numeric(e['nb_medecins'],    errors='coerce').fillna(0).astype(int)
e['nb_urgentistes'] = pd.to_numeric(e['nb_urgentistes'], errors='coerce').fillna(0).astype(int)

log.info(f"Etablissements Silver : {len(e):,} lignes")
sauver(e, SILVER, 'etablissements_SILVER.csv')


# ═══════════════════════════════════════════════════════════
# ÉTAPE 3 — GOLD : Feature Engineering
# ═══════════════════════════════════════════════════════════
log.info("\n── ÉTAPE 3 : Gold (feature engineering) ──")

# ── Urgences Gold ────────────────────────────────────────
ug = u.copy()

# Colonnes temporelles
ug['Heure_Arrivee'] = ug['date_arrivee'].dt.hour
ug['Jour_Semaine']  = ug['date_arrivee'].dt.dayofweek
ug['Mois']          = ug['date_arrivee'].dt.month
ug['Annee']         = ug['date_arrivee'].dt.year

# Saison (recalculée depuis la date)
def saison_from_mois(m):
    if m in [12, 1, 2]: return 'Hiver'
    if m in [3, 4, 5]:  return 'Printemps'
    if m in [6, 7, 8]:  return 'Eté'
    return 'Automne'

ug['Saison']        = ug['Mois'].apply(saison_from_mois)
ug['Tranche_Horaire']= ug['Heure_Arrivee'].apply(tranche_horaire)
ug['Nom_Jour']      = ug['Jour_Semaine'].apply(lambda x: JOURS[x] if 0 <= x <= 6 else 'Inconnu')
ug['Groupe_Age']    = ug['age'].apply(groupe_age)

# Est_Pic : flux horaire > Q75
flux_heure = ug.groupby(ug['date_arrivee'].dt.floor('h')).size()
q75 = flux_heure.quantile(0.75)
ug['date_h'] = ug['date_arrivee'].dt.floor('h')
flux_map = flux_heure.to_dict()
ug['flux_h'] = ug['date_h'].map(flux_map).fillna(0)
ug['Est_Pic'] = (ug['flux_h'] > q75).astype(int)
ug = ug.drop(columns=['date_h', 'flux_h'])

# Renommer colonnes pour Gold
rename_map = {
    'IPP'       : 'IPP',
    'IPP_src': 'IPP',
    'nom_complet'      : 'Nom_Complet',
    'age'              : 'Age',
    'sexe'             : 'Sexe',
    'wilaya'           : 'Wilaya',
    'groupe_sanguin'   : 'Groupe_Sanguin',
    'antecedents'      : 'Antecedents',
    'etablissement'    : 'Etablissement',
    'type_etab'        : 'Type_Etab',
    'ville'            : 'Ville',
    'date_arrivee'     : 'Date_Arrivee',
    'date_sortie'      : 'Date_Sortie',
    'niveau_triage'    : 'Niveau_Triage',
    'motif_consultation': 'Motif_Consultation',
    'orientation'      : 'Orientation',
    'duree_sejour_min' : 'Duree_Sejour_min',
    'nb_medecins_dispo': 'Nb_Medecins_Dispo',
    'nb_lits_dispo'    : 'Nb_Lits_Dispo',
    'jour_ferie'       : 'Jour_Ferie',
}
ug = ug.rename(columns=rename_map)

# Sélectionner colonnes Gold finales
cols_gold = [
    'IPP','IPP','Nom_Complet','Age','Sexe','Wilaya','Groupe_Sanguin',
    'Antecedents','Etablissement','Type_Etab','Ville','Date_Arrivee','Date_Sortie',
    'Niveau_Triage','Motif_Consultation','Orientation','Duree_Sejour_min',
    'Nb_Medecins_Dispo','Nb_Lits_Dispo','Jour_Ferie','Saison','Heure_Arrivee',
    'Jour_Semaine','Mois','Annee','Tranche_Horaire','Nom_Jour','Groupe_Age','Est_Pic'
]
# Garder seulement les colonnes disponibles
cols_gold = [c for c in cols_gold if c in ug.columns]
ug = ug[cols_gold]

log.info(f"Urgences Gold : {len(ug):,} lignes, {ug.shape[1]} colonnes")
sauver(ug, GOLD, 'urgences_GOLD.csv')

# ── Soins Gold ───────────────────────────────────────────
sg = s.copy()

sg = sg.rename(columns={
    'type_soin'           : 'Type_Soin',
    'medicament'          : 'Medicament',
    'medecin_responsable' : 'Medecin',
    'cout_soin'           : 'Cout_Soin',
    'duree_soin_min'      : 'Duree_Soin_Min',
    'resultat'            : 'Resultat',
    'date_soin'           : 'Date_Soin',
    'etablissement'       : 'Etablissement',
    'age'                 : 'Age',
    'sexe'                : 'Sexe',
    'niveau_triage'       : 'niveau_triage',
})

cols_soins = ['id_soin','IPP','Etablissement','Age','Sexe','niveau_triage',
              'Type_Soin','Medicament','Medecin','Cout_Soin','Duree_Soin_Min','Resultat','Date_Soin']
cols_soins = [c for c in cols_soins if c in sg.columns]
sg = sg[cols_soins]

log.info(f"Soins Gold : {len(sg):,} lignes")
sauver(sg, GOLD, 'soins_GOLD.csv')

# ── Etablissements Gold ──────────────────────────────────
eg = e.copy()

# Agrégats depuis urgences Gold
stats = ug.groupby('Etablissement').agg(
    Nb_Patients   = ('IPP', 'count'),
    Duree_Moy_Min = ('Duree_Sejour_min', 'mean'),
).reset_index()

def taux(col, val):
    return ug[ug[col] == val].groupby('Etablissement').size() / \
           ug.groupby('Etablissement').size() * 100

taux_hospit = taux('Orientation', 'Hospitalise').rename('Taux_Hospit_Pct')
taux_fugue  = taux('Orientation', 'Fugue').rename('Taux_Fugue_Pct')
taux_p1     = (ug[ug['Niveau_Triage'].str.startswith('P1', na=False)]
               .groupby('Etablissement').size() /
               ug.groupby('Etablissement').size() * 100).rename('Taux_P1_Pct')

eg = eg.merge(stats, left_on='nom', right_on='Etablissement', how='left').drop(columns=['Etablissement'], errors='ignore')

th = taux_hospit.reset_index(); th.columns = ['nom', 'Taux_Hospit_Pct']
tf = taux_fugue.reset_index();  tf.columns = ['nom', 'Taux_Fugue_Pct']
tp = taux_p1.reset_index();     tp.columns = ['nom', 'Taux_P1_Pct']

eg = eg.merge(th, on='nom', how='left')
eg = eg.merge(tf, on='nom', how='left')
eg = eg.merge(tp, on='nom', how='left')

eg['Nb_Patients']    = eg['Nb_Patients'].fillna(0).astype(int)
eg['Duree_Moy_Min']  = eg['Duree_Moy_Min'].fillna(0).round(1)
eg['Taux_Hospit_Pct']= eg['Taux_Hospit_Pct'].fillna(0).round(2)
eg['Taux_Fugue_Pct'] = eg['Taux_Fugue_Pct'].fillna(0).round(2)
eg['Taux_P1_Pct']    = eg['Taux_P1_Pct'].fillna(0).round(2)

# Alerte charge
def alerte(row):
    if row['Taux_Hospit_Pct'] > 60 or row['Taux_P1_Pct'] > 20: return 'Critique'
    if row['Taux_Hospit_Pct'] > 40 or row['Taux_P1_Pct'] > 10: return 'Elevé'
    return 'Normal'

eg['Alerte_Charge']        = eg.apply(alerte, axis=1)
eg['Ratio_Medecins_Lits']  = (eg['nb_medecins'] / eg['capacite_lits'].replace(0, np.nan)).round(3)

def categorie_taille(lits):
    if lits >= 400: return 'Grand'
    if lits >= 200: return 'Moyen'
    return 'Petit'

eg['Categorie_Taille'] = eg['capacite_lits'].apply(categorie_taille)

cols_etab = ['nom','type_etab','ville','capacite_lits','nb_medecins','nb_urgentistes',
             'Nb_Patients','Duree_Moy_Min','Taux_Hospit_Pct','Taux_Fugue_Pct',
             'Taux_P1_Pct','Alerte_Charge','Ratio_Medecins_Lits','Categorie_Taille']
cols_etab = [c for c in cols_etab if c in eg.columns]
eg = eg[cols_etab]

log.info(f"Etablissements Gold : {len(eg):,} lignes")
sauver(eg, GOLD, 'etablissements_GOLD.csv')

# ── Série Temporelle Daily ───────────────────────────────
ts = ug.copy()
ts['date'] = pd.to_datetime(ts['Date_Arrivee']).dt.date
serie = ts.groupby('date').size().reset_index()
serie.columns = ['ds', 'y']
serie['ds'] = pd.to_datetime(serie['ds'])
serie = serie.sort_values('ds')

log.info(f"Série temporelle : {len(serie):,} jours ({serie['ds'].min().date()} → {serie['ds'].max().date()})")
sauver(serie, GOLD, 'serie_temporelle_daily.csv')


# ═══════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════
log.info("\n" + "=" * 60)
log.info("ETL TERMINÉ AVEC SUCCÈS")
log.info("=" * 60)

print("\nFICHIERS GOLD GENERES :")
for f in ['urgences_GOLD.csv','soins_GOLD.csv','etablissements_GOLD.csv','serie_temporelle_daily.csv']:
    path = os.path.join(GOLD, f)
    if os.path.exists(path):
        df = pd.read_csv(path)
        print(f"  {f:<35} {len(df):>7,} lignes  {df.shape[1]:>3} colonnes")
    else:
        print(f"  {f:<35} MANQUANT !")
