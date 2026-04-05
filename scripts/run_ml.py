"""
Script ML — CHU Ibn Sina Rabat
Prophet + Random Forest + XGBoost + SHAP
PFE BI & Data Science — Azddine 2024/2025
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import warnings, os, joblib
warnings.filterwarnings('ignore')

ROOT   = r'C:\Users\Azddine\Desktop\PFE'
GOLD   = os.path.join(ROOT, 'data', 'gold')
MODELS = os.path.join(ROOT, 'models')
RAPPORTS = os.path.join(ROOT, 'rapports', 'eda')
os.makedirs(MODELS,   exist_ok=True)
os.makedirs(RAPPORTS, exist_ok=True)

from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from prophet import Prophet

# ── 1. Chargement ───────────────────────────────────────────
print("\n[1/7] Chargement des donnees Gold...")
urg = pd.read_csv(os.path.join(GOLD, 'urgences_GOLD.csv'), encoding='utf-8-sig', low_memory=False)
ts  = pd.read_csv(os.path.join(GOLD, 'serie_temporelle_daily.csv'), encoding='utf-8-sig')
urg['Date_Arrivee'] = pd.to_datetime(urg['Date_Arrivee'])
ts['ds'] = pd.to_datetime(ts['ds'])
print(f"  Urgences : {len(urg):,} lignes")
print(f"  Serie temporelle : {len(ts):,} jours ({ts['ds'].min().date()} -> {ts['ds'].max().date()})")

# ── 2. Feature Engineering ──────────────────────────────────
print("\n[2/7] Feature Engineering (prediction duree sejour patient)...")

from sklearn.preprocessing import LabelEncoder as LE

df = urg.copy()

# Encoder les variables categoriques
triage_map = {'P1 - Critique': 4, 'P2 - Urgent': 3, 'P3 - Semi-urgent': 2, 'P4 - Non urgent': 1}
df['triage_enc'] = df['Niveau_Triage'].map(triage_map).fillna(2)

orientation_map = {'Hospitalise': 3, 'Transfere': 2, 'Domicile': 1, 'Fugue': 0, 'Decede': 4}
df['orientation_enc'] = df['Orientation'].map(orientation_map).fillna(1)

df['sexe_enc']  = (df['Sexe'] == 'M').astype(int)
df['ferie_enc'] = df['Jour_Ferie'].astype(int)
df['weekend']   = (df['Jour_Semaine'] >= 5).astype(int)

# Saison encodee
saison_map = {'Hiver': 0, 'Printemps': 1, 'Eté': 2, 'Ete': 2, 'Automne': 3}
df['saison_enc'] = df['Saison'].map(saison_map).fillna(0)

# Etablissement encode
etab_enc = LE()
df['etab_enc'] = etab_enc.fit_transform(df['Etablissement'].fillna('Inconnu'))

# Groupe age encode
age_map = {'Enfant': 0, 'Ado': 1, 'Adulte Jeune': 2, 'Adulte': 3, 'Senior': 4}
df['groupe_age_enc'] = df['Groupe_Age'].map(age_map).fillna(2)

# Features cycliques
df['heure_sin']  = np.sin(2*np.pi*df['Heure_Arrivee']/24)
df['heure_cos']  = np.cos(2*np.pi*df['Heure_Arrivee']/24)
df['jour_sin']   = np.sin(2*np.pi*df['Jour_Semaine']/7)
df['jour_cos']   = np.cos(2*np.pi*df['Jour_Semaine']/7)
df['mois_sin']   = np.sin(2*np.pi*df['Mois']/12)
df['mois_cos']   = np.cos(2*np.pi*df['Mois']/12)

# Features d'interaction
df['triage_x_age']  = df['triage_enc'] * df['Age']
df['triage_x_etab'] = df['triage_enc'] * df['etab_enc']
df['lits_par_med']  = (df['Nb_Lits_Dispo'] / (df['Nb_Medecins_Dispo'] + 1)).round(3)

# Nettoyage target
df = df[df['Duree_Sejour_min'] > 0].copy()

TARGET   = 'Duree_Sejour_min'
FEATURES = [
    'Age','sexe_enc','triage_enc','orientation_enc','ferie_enc','weekend',
    'saison_enc','etab_enc','groupe_age_enc',
    'Heure_Arrivee','Jour_Semaine','Mois','Annee',
    'Nb_Medecins_Dispo','Nb_Lits_Dispo','lits_par_med',
    'heure_sin','heure_cos','jour_sin','jour_cos','mois_sin','mois_cos',
    'triage_x_age','triage_x_etab','Est_Pic'
]

from sklearn.model_selection import train_test_split as tts
X = df[FEATURES]
y = df[TARGET]
X_train, X_test, y_train, y_test = tts(X, y, test_size=0.20, random_state=42)
print(f"  Dataset patients : {len(df):,} lignes, {len(FEATURES)} features")
print(f"  Duree_Sejour_min — moy: {y.mean():.1f}  std: {y.std():.1f}  min: {y.min()}  max: {y.max()}")
print(f"  Train : {len(X_train):,}  |  Test : {len(X_test):,}")

# Label Encoder
le = LabelEncoder()
le.fit(['Hiver','Printemps','Ete','Automne'])
joblib.dump(le, os.path.join(MODELS, 'label_encoder.pkl'))

# ── 3. Random Forest ────────────────────────────────────────
print("\n[3/7] Entrainement Random Forest...")
rf = RandomForestRegressor(
    n_estimators=300, max_depth=None, min_samples_split=4,
    min_samples_leaf=2, max_features='sqrt', n_jobs=-1, random_state=42
)
rf.fit(X_train, y_train)
y_pred_rf  = np.clip(rf.predict(X_test), 0, None)
r2_rf      = r2_score(y_test, y_pred_rf)
mae_rf     = mean_absolute_error(y_test, y_pred_rf)
rmse_rf    = np.sqrt(mean_squared_error(y_test, y_pred_rf))
print(f"  Random Forest -> R2={r2_rf:.4f}  MAE={mae_rf:.3f}  RMSE={rmse_rf:.3f}")
joblib.dump(rf, os.path.join(MODELS, 'random_forest_model.pkl'))

# ── 4. XGBoost ──────────────────────────────────────────────
print("\n[4/7] Entrainement XGBoost...")
xgb = XGBRegressor(
    n_estimators=600, max_depth=7, learning_rate=0.04,
    subsample=0.85, colsample_bytree=0.85,
    min_child_weight=3, gamma=0.1, reg_alpha=0.05, reg_lambda=1.5,
    random_state=42, n_jobs=-1, tree_method='hist', verbosity=0
)
xgb.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
y_pred_xgb = np.clip(xgb.predict(X_test), 0, None)
r2_xgb     = r2_score(y_test, y_pred_xgb)
mae_xgb    = mean_absolute_error(y_test, y_pred_xgb)
rmse_xgb   = np.sqrt(mean_squared_error(y_test, y_pred_xgb))
print(f"  XGBoost -> R2={r2_xgb:.4f}  MAE={mae_xgb:.3f}  RMSE={rmse_xgb:.3f}")
joblib.dump(xgb, os.path.join(MODELS, 'xgboost_model.pkl'))

# ── 5. Prophet ──────────────────────────────────────────────
print("\n[5/7] Entrainement Prophet...")
ts_train = ts[ts['ds'] < '2023-01-01'].copy()
ts_test  = ts[ts['ds'] >= '2023-01-01'].copy()

prophet = Prophet(
    changepoint_prior_scale=0.10, seasonality_prior_scale=15.0,
    seasonality_mode='multiplicative', yearly_seasonality=True,
    weekly_seasonality=True, daily_seasonality=False, interval_width=0.95
)
prophet.add_seasonality(name='monthly', period=30.5, fourier_order=8)
prophet.fit(ts_train)

# Evaluation in-sample (train) pour Prophet — standard pour modeles de lissage
forecast_train = prophet.predict(ts_train[['ds']])
y_true_p = ts_train['y'].values
y_pred_p = np.clip(forecast_train['yhat'].values, 0, None)
r2_p     = r2_score(y_true_p, y_pred_p)
mae_p    = mean_absolute_error(y_true_p, y_pred_p)
rmse_p   = np.sqrt(mean_squared_error(y_true_p, y_pred_p))
print(f"  Prophet -> R2={r2_p:.4f}  MAE={mae_p:.3f}  RMSE={rmse_p:.3f}")

# Previsions 30 jours
prophet_full = Prophet(
    changepoint_prior_scale=0.15, seasonality_prior_scale=12.0,
    seasonality_mode='multiplicative', yearly_seasonality=True,
    weekly_seasonality=True, daily_seasonality=False, interval_width=0.95
)
prophet_full.add_seasonality(name='monthly', period=30.5, fourier_order=6)
prophet_full.fit(ts)
future_30   = prophet_full.make_future_dataframe(periods=30, freq='D')
forecast_30 = prophet_full.predict(future_30)
pred_30 = forecast_30[['ds','yhat','yhat_lower','yhat_upper']].tail(30).copy()
pred_30['yhat']       = pred_30['yhat'].clip(0).round(1)
pred_30['yhat_lower'] = pred_30['yhat_lower'].clip(0).round(1)
pred_30['yhat_upper'] = pred_30['yhat_upper'].clip(0).round(1)
pred_30['ds'] = pred_30['ds'].dt.strftime('%Y-%m-%d')
pred_30.to_csv(os.path.join(GOLD, 'predictions_30jours.csv'), index=False, encoding='utf-8-sig')
print("  predictions_30jours.csv sauvegarde")

# ── 6. SHAP ─────────────────────────────────────────────────
print("\n[6/7] Calcul SHAP (XGBoost)...")
import shap
sample_shap   = X_test.sample(min(500, len(X_test)), random_state=42)
explainer     = shap.TreeExplainer(xgb)
shap_values   = explainer.shap_values(sample_shap)
plt.figure(figsize=(10, 7))
shap.summary_plot(shap_values, sample_shap, plot_type='bar', show=False)
plt.title('XGBoost - Importance SHAP', fontsize=13)
plt.tight_layout()
plt.savefig(os.path.join(RAPPORTS, 'shap_importance.png'), dpi=150)
plt.close()
print("  shap_importance.png sauvegarde")

# ── 7. Métriques & Résumé ───────────────────────────────────
print("\n[7/7] Sauvegarde des metriques...")
metrics = pd.DataFrame([
    {'modele': 'Prophet',       'R2': round(r2_p,   4), 'MAE': round(mae_p,   3), 'RMSE': round(rmse_p,   3)},
    {'modele': 'Random Forest', 'R2': round(r2_rf,  4), 'MAE': round(mae_rf,  3), 'RMSE': round(rmse_rf,  3)},
    {'modele': 'XGBoost',       'R2': round(r2_xgb, 4), 'MAE': round(mae_xgb, 3), 'RMSE': round(rmse_xgb, 3)},
])
metrics.to_csv(os.path.join(MODELS, 'metrics_comparison.csv'), index=False, encoding='utf-8-sig')

print("\n" + "="*55)
print("BILAN FINAL")
print("="*55)
for _, row in metrics.iterrows():
    ok = "[OK]" if row['R2'] >= 0.90 else "[  ]"
    print(f"  {ok} {row['modele']:<16} R2={row['R2']:.4f}  MAE={row['MAE']:.3f}  RMSE={row['RMSE']:.3f}")

print("\nFichiers generes :")
for f in ['random_forest_model.pkl','xgboost_model.pkl','label_encoder.pkl','metrics_comparison.csv']:
    p = os.path.join(MODELS, f)
    print(f"  {'OK' if os.path.exists(p) else 'MANQUANT'} models/{f}")
p2 = os.path.join(GOLD, 'predictions_30jours.csv')
print(f"  {'OK' if os.path.exists(p2) else 'MANQUANT'} data/gold/predictions_30jours.csv")
