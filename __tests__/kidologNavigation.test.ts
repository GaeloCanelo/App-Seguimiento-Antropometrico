import { getStateFromPath } from 'expo-router/build/fork/getStateFromPath';
import { getRoutes } from 'expo-router/build/getRoutes';
import { getReactNavigationConfig } from 'expo-router/build/getReactNavigationConfig';
import { tabDestinations } from '../src/views/utils/tabDestinations';
import { artwork } from '../src/views/components/kidologArtwork';
import { CATALOGO_INDICADORES } from '../src/domain';
import { indicatorFromParam } from '../src/views/utils/indicators';

// These tests use Node's filesystem, in the same test environment as the SQLite adapter.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readdirSync, readFileSync } = require('node:fs') as {
  readdirSync: (
    path: string,
    options: { withFileTypes: true },
  ) => Array<{ name: string; isDirectory(): boolean }>;
  readFileSync: (path: string, encoding: 'utf8') => string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { join } = require('node:path') as { join: (...paths: string[]) => string };

const app = join(process.cwd(), 'src', 'app');

function routeFiles(directory: string, prefix = './'): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) return routeFiles(join(directory, entry.name), relative + '/');
    return entry.name.endsWith('.tsx') ? [relative] : [];
  });
}

const context = Object.assign(() => ({}), {
  id: app,
  keys: () => routeFiles(app),
  resolve: (name: string) => name,
});
const tree = getRoutes(context, { ignoreEntryPoints: true, skipGenerated: true });
const config = getReactNavigationConfig(tree, false);

it.each([
  ['/', 'index', undefined],
  ['/login', 'login', undefined],
  ['/register', 'register', undefined],
  ['/forgot-password', 'forgot-password', undefined],
  ['/pacientes', 'pacientes', undefined],
  ['/registrar-paciente', 'registrar-paciente', undefined],
  ['/paciente/paciente-1', 'paciente/[id]/index', { id: 'paciente-1' }],
  ['/paciente/paciente-1/nueva-consulta', 'paciente/[id]/nueva-consulta', { id: 'paciente-1' }],
  [
    '/paciente/consulta/consulta-1',
    'paciente/consulta/[idConsulta]/index',
    { idConsulta: 'consulta-1' },
  ],
  [
    '/paciente/paciente-1/curvas?consulta=consulta-1',
    'paciente/[id]/curvas',
    { id: 'paciente-1', consulta: 'consulta-1' },
  ],
  [
    '/paciente/consulta/consulta-1/reporte',
    'paciente/consulta/[idConsulta]/reporte',
    { idConsulta: 'consulta-1' },
  ],
  ['/cuenta', 'cuenta', undefined],
  ['/paciente/paciente-1/editar', 'paciente/[id]/editar', { id: 'paciente-1' }],
  [
    '/paciente/consulta/consulta-1/editar',
    'paciente/consulta/[idConsulta]/editar',
    { idConsulta: 'consulta-1' },
  ],
] as const)('Expo Router resuelve %s a %s', (url, screen, params) => {
  let route = getStateFromPath(url, config)?.routes.at(-1);
  while (route?.state) route = route.state.routes.at(-1);
  expect(route?.name).toBe(screen);
  if (params) expect(route?.params).toMatchObject(params);
});

it('preserva los SVG originales en el bundle, sin referencias a archivos remotos', () => {
  for (const [name, markup] of Object.entries(artwork)) {
    const file = join(process.cwd(), 'assets', 'kidolog', name + '.svg');
    expect(markup).toMatch(/^<svg\b/);
    expect(markup.replace(/\r\n/g, '\n')).toBe(
      readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim(),
    );
    expect(markup).not.toMatch(/(?:href|src)="https?:/);
  }
});

it.each(CATALOGO_INDICADORES)('abre la curva de $codigo_indicador para la consulta', (meta) => {
  const code = meta.codigo_indicador;
  let route = getStateFromPath(
    `/paciente/paciente-1/curvas?consulta=consulta-1&indicador=${code}`,
    config,
  )?.routes.at(-1);
  while (route?.state) route = route.state.routes.at(-1);
  expect(route?.name).toBe('paciente/[id]/curvas');
  expect(route?.params).toMatchObject({
    id: 'paciente-1',
    consulta: 'consulta-1',
    indicador: code,
  });
  expect(indicatorFromParam((route?.params as { indicador?: string })?.indicador)).toBe(code);
});

it('usa peso para la edad si el enlace no trae un indicador válido y único', () => {
  expect(indicatorFromParam()).toBe('P_E');
  expect(indicatorFromParam('desconocido')).toBe('P_E');
  expect(indicatorFromParam(['T_E', 'P_T'])).toBe('P_E');
});

it('la barra compartida tiene tres destinos únicos y cada enlace resuelve a su pestaña', () => {
  expect(tabDestinations.map((tab) => tab.label)).toEqual(['Pacientes', 'Nuevo', 'Ajustes']);
  expect(new Set(tabDestinations.map((tab) => tab.name)).size).toBe(3);
  for (const tab of tabDestinations) {
    let match = getStateFromPath(tab.href, config)?.routes.at(-1);
    while (match?.state) match = match.state.routes.at(-1);
    expect(match?.name).toBe(tab.name);
  }
});
