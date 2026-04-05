export const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrateur',
  chef_medecin: 'Médecin Chef',
  urgentiste:   'Médecin Urgentiste',
  infirmier:    'Cadre Infirmier',
  directeur:    'Directeur Médical',
  analyste:     'Data Analyst',
  admin_si:     'Admin SI',
};

// Pages each role can access
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin:        ['/', '/temporel', '/etablissements', '/predictions', '/soins', '/carte', '/comparaison', '/tableau', '/triage', '/alertes', '/admission', '/ressources', '/patients', '/utilisateurs', '/personnel', '/lits'],
  chef_medecin: ['/', '/temporel', '/etablissements', '/predictions', '/soins', '/carte', '/comparaison', '/tableau', '/triage', '/alertes', '/admission', '/ressources', '/patients', '/personnel', '/lits'],
  urgentiste:   ['/', '/temporel', '/predictions', '/tableau', '/carte', '/triage', '/alertes', '/admission', '/ressources', '/patients', '/lits'],
  infirmier:    ['/', '/tableau', '/predictions', '/etablissements', '/triage', '/alertes', '/admission', '/ressources', '/patients', '/lits'],
  directeur:    ['/', '/temporel', '/etablissements', '/comparaison', '/soins', '/alertes', '/ressources', '/patients', '/personnel', '/lits'],
  analyste:     ['/', '/temporel', '/etablissements', '/predictions', '/soins', '/carte', '/comparaison', '/tableau', '/triage', '/alertes', '/ressources', '/personnel', '/lits'],
  admin_si:     ['/', '/temporel', '/etablissements', '/predictions', '/soins', '/carte', '/comparaison', '/tableau', '/triage', '/alertes', '/admission', '/ressources', '/patients', '/utilisateurs', '/personnel', '/lits'],
};

export const canAccess = (role: string | undefined, path: string): boolean => {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(path);
};
