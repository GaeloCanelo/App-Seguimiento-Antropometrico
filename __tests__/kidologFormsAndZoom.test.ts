import { erroresConsulta, erroresPaciente } from '../src/views/utils/clinicalFormErrors';
import { mensajeEnEspanol, validarCamposAcceso } from '../src/views/utils/formErrors';
import { edadPaciente, folioAutomatico, folioVisible } from '../src/views/utils/patientDisplay';
import { constrainChart, initialTransform, scaleChart } from '../src/views/utils/graphZoom';

it('genera el folio sin prefijo, abrevia solo los folios automáticos anteriores y muestra una edad legible', () => {
  expect(folioAutomatico('18e73c88-326c-4800-8067-1a2b3c4d5e6f')).toBe('1A2B3C4D5E6F');
  expect(folioVisible('KID-1A2B3C4D5E6F')).toBe('1A2B3C4D5E6F');
  expect(folioVisible('KID-0001')).toBe('KID-0001');
  expect(edadPaciente('2024-11-22', '2026-11-22')).toBe('24 meses');
  expect(edadPaciente('2026-11-21', '2026-11-22')).toBe('1 día');
  expect(edadPaciente('2026-01-31', '2026-03-01')).not.toMatch(/-\d/);
});

it('localiza errores técnicos y valida el registro sin imponer un mínimo nuevo al inicio de sesión', () => {
  expect(validarCamposAcceso({ email: 'malo', password: '' })).toMatchObject({
    email: expect.any(String),
    password: expect.any(String),
  });
  expect(validarCamposAcceso({ email: 'cuenta@example.test', password: '123' })).toEqual({});
  expect(
    validarCamposAcceso({ email: 'cuenta@example.test', password: '123', confirmation: '456' }),
  ).toMatchObject({
    password: 'Usa al menos 8 caracteres.',
    confirmation: 'Las contraseñas no coinciden.',
  });
  expect(
    mensajeEnEspanol(
      { code: 'auth/network-request-failed', message: 'Network error' },
      'Intenta de nuevo.',
    ),
  ).toMatch(/conexión/);
  expect(mensajeEnEspanol(new Error('Unexpected server error'), 'Intenta de nuevo.')).toBe(
    'Intenta de nuevo.',
  );
});

it('muestra errores de fecha y medidas junto a sus campos con las reglas clínicas actuales', () => {
  expect(
    erroresPaciente({ folio_clinico: 'PRUEBA', nombre: '', fecha_nacimiento: '' }),
  ).toMatchObject({
    nombre: expect.any(String),
    fecha_nacimiento: 'Selecciona la fecha de nacimiento.',
  });
  const input = {
    fecha_nacimiento: '2025-05-18',
    fecha_consulta: '2026-11-18',
    fecha_hoy: '2026-11-22',
    posicion_medicion: 'ACOSTADO' as const,
    peso_kg: Number.NaN,
    longitud_talla_cm: 82,
    perimetro_cefalico_cm: 125,
  };
  expect(
    erroresConsulta(input, { peso_kg: '', longitud_talla_cm: '82', perimetro_cefalico_cm: '125' }),
  ).toMatchObject({
    peso_kg: 'Escribe una medida.',
    perimetro_cefalico_cm: expect.stringContaining('25 y 60'),
  });
  expect(
    erroresConsulta(
      { ...input, peso_kg: 10.5, perimetro_cefalico_cm: 46 },
      { peso_kg: '10,50', longitud_talla_cm: '82', perimetro_cefalico_cm: '46' },
    ),
  ).toEqual({});
});

it('limita la ampliación y el desplazamiento al área de datos y restablece la vista', () => {
  const size = { width: 300, height: 200 };
  expect(scaleChart(initialTransform, 4, size)).toEqual({ scale: 3, x: 0, y: 0 });
  expect(constrainChart({ scale: 2, x: 800, y: -800 }, size)).toEqual({
    scale: 2,
    x: 150,
    y: -100,
  });
  expect(scaleChart({ scale: 2, x: 150, y: -100 }, 1, size)).toEqual(initialTransform);
});
