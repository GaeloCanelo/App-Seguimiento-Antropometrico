export const tabDestinations = [
  { name: 'pacientes', href: '/(tabs)/pacientes', label: 'Pacientes', icon: 'users' },
  { name: 'registrar-paciente', href: '/(tabs)/registrar-paciente', label: 'Nuevo', icon: 'plus' },
  { name: 'cuenta', href: '/(tabs)/cuenta', label: 'Ajustes', icon: 'settings' },
] as const;

export type TabDestination = (typeof tabDestinations)[number];
export type TabName = TabDestination['name'];
