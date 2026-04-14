import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export interface KPIs {
  total: number; patients_par_jour: number; duree_moy: number;
  taux_hospit: number; taux_fugue: number; taux_p1: number;
}
export interface TSPoint    { ds: string; y: number; }
export interface HorairePoint { heure: number; nb_patients: number; }
export interface TriagePoint  { triage: string; count: number; pct: number; }
export interface OrientPoint  { orientation: string; count: number; pct: number; }
export interface AnnuelPoint  { Annee: number; nb_patients: number; variation_pct: number; }
export interface SaisonPoint  { saison: string; nb_patients: number; }
export interface JourPoint    { jour: string; nb_patients: number; }
export interface Etab {
  nom: string; type_etab: string; ville: string; capacite_lits: number;
  nb_medecins: number; nb_urgentistes: number; Nb_Patients: number;
  Duree_Moy_Min: number; Taux_Hospit_Pct: number; Taux_Fugue_Pct: number;
  Taux_P1_Pct: number; Alerte_Charge: string; Ratio_Medecins_Lits: number;
  Categorie_Taille: string;
  // Enriched fields
  adresse?: string; telephone?: string; email?: string; directeur?: string;
  annee_fondation?: number; nb_infirmiers?: number; nb_ambulances?: number;
  services?: string; accreditation?: string; superficie_m2?: number;
}
export interface SoinType    { type_soin: string; count: number; }
export interface CoutType    { type_soin: string; cout_moyen: number; }
export interface CoutEtab    { etablissement: string; cout_total: number; }
export interface Resultat    { resultat: string; count: number; }
export interface Medicament  { medicament: string; count: number; }
export interface Prediction  { ds: string; yhat: number; yhat_lower: number; yhat_upper: number; }
export interface Metrique    { modele: string; R2: number; MAE: number; RMSE: number; }
export interface SimInput    { mois: number; heure: number; jour_semaine: number; jour_ferie: number; saison: string; }
export interface SimOutput   { prediction: number; niveau: string; couleur: string; }
export interface TopMotif    { motif: string; count: number; pct: number; triage_principal: string; p1_rate: number; hospit_rate: number; avg_duree: number; tendance: number; }
export interface MaladieSaison { motif: string; count: number; pct: number; p1_rate: number; hospit_rate: number; avg_duree: number; }
export interface SaisonMaladies { saison: string; total_patients: number; maladies: MaladieSaison[]; }

export const fetchKPIs            = (annees = '', orientation = '') => API.get<KPIs>(`/kpis?annees=${annees}&orientation=${orientation}`).then(r => r.data);
export const fetchTemporel        = (annees = '2019,2020,2021,2022,2023') => API.get<TSPoint[]>(`/urgences/temporel?annees=${annees}`).then(r => r.data);
export const fetchHoraire         = () => API.get<HorairePoint[]>('/urgences/horaire').then(r => r.data);
export const fetchTriage          = () => API.get<TriagePoint[]>('/urgences/triage').then(r => r.data);
export const fetchOrientation     = () => API.get<OrientPoint[]>('/urgences/orientation').then(r => r.data);
export const fetchAnnuel          = () => API.get<AnnuelPoint[]>('/urgences/annuel').then(r => r.data);
export const fetchSaison          = () => API.get<SaisonPoint[]>('/urgences/saison').then(r => r.data);
export const fetchJour            = () => API.get<JourPoint[]>('/urgences/jour').then(r => r.data);
export const fetchEtablissements  = () => API.get<Etab[]>('/etablissements').then(r => r.data);
export const fetchSoinsTypes      = () => API.get<SoinType[]>('/soins/types').then(r => r.data);
export const fetchCoutsParType    = () => API.get<CoutType[]>('/soins/couts_par_type').then(r => r.data);
export const fetchCoutsParEtab    = () => API.get<CoutEtab[]>('/soins/couts_par_etab').then(r => r.data);
export const fetchResultats       = () => API.get<Resultat[]>('/soins/resultats').then(r => r.data);
export const fetchMedicaments     = () => API.get<Medicament[]>('/soins/medicaments').then(r => r.data);
export const fetchPredictions     = () => API.get<Prediction[]>('/predictions').then(r => r.data);
export const fetchMetriques       = () => API.get<Metrique[]>('/modeles/metriques').then(r => r.data);
export const postSimulateur       = (body: SimInput) => API.post<SimOutput>('/simulateur', body).then(r => r.data);
export const fetchTopMotifs           = () => API.get<TopMotif[]>('/urgences/top_motifs').then(r => r.data);
export const fetchMaladiesSaisonnieres = () => API.get<SaisonMaladies[]>('/urgences/maladies_saisonnieres').then(r => r.data);
