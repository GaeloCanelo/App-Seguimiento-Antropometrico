import {
  calcularEdadEnDias,
  detectarDecrementoMedida,
  formatearEdadMesesYDias,
  sugerirPosicionMedicion,
  validarMedicionesConsulta,
  validarPacienteDatos,
} from '../src/domain/ageAndValidation';
import { clasificarIndicador, esPuntajeZAtipico } from '../src/domain/classification';

describe('Validaciones clínicas, edad y clasificación referencial (CU-07, CU-12, CU-15)', () => {
  it('PA-01: bloquea pacientes mayores de 60 meses y acepta pacientes de 59 meses', () => {
    const errores61m = validarPacienteDatos({
      folio_clinico: 'PAC-001',
      nombre: 'Infante Prueba',
      fecha_nacimiento: '2021-10-01',
      fecha_hoy: '2026-11-17',
    });
    expect(errores61m.some((e) => e.campo === 'fecha_nacimiento')).toBe(true);

    const errores59m = validarPacienteDatos({
      folio_clinico: 'PAC-001',
      nombre: 'Infante Prueba',
      fecha_nacimiento: '2021-12-17',
      fecha_hoy: '2026-11-17',
    });
    expect(errores59m).toHaveLength(0);
  });

  it('calcula edad en días sin desfases de zona horaria y formatea meses y días', () => {
    expect(calcularEdadEnDias('2026-01-01', '2026-01-01')).toBe(0);
    expect(calcularEdadEnDias('2025-11-17', '2026-11-17')).toBe(365);

    const fmt = formatearEdadMesesYDias('2025-01-15', '2026-03-20');
    expect(fmt.meses).toBe(14);
    expect(fmt.dias).toBe(5);
    expect(fmt.texto).toBe('14 meses y 5 días');
  });

  it('sugiere posición ACOSTADO (< 24 meses) o DE_PIE (>= 24 meses)', () => {
    expect(sugerirPosicionMedicion(730)).toBe('ACOSTADO');
    expect(sugerirPosicionMedicion(731)).toBe('DE_PIE');
  });

  it('rechaza valores fuera de rango fisiológico o con exceso de decimales (CU-15)', () => {
    const errores = validarMedicionesConsulta({
      fecha_nacimiento: '2025-01-01',
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 0.4, // min 0.5
      longitud_talla_cm: 80.12, // max 1 decimal
      perimetro_cefalico_cm: 65, // max 60
      posicion_medicion: 'ACOSTADO',
    });
    expect(errores.map((e) => e.campo)).toEqual([
      'peso_kg',
      'longitud_talla_cm',
      'perimetro_cefalico_cm',
    ]);
  });

  it('detecta decremento > 1 cm respecto a la consulta previa (CU-15 4b)', () => {
    const avisos = detectarDecrementoMedida(
      { longitud_talla_cm: 82.0, perimetro_cefalico_cm: 47.5 },
      { longitud_talla_cm: 80.5, perimetro_cefalico_cm: 46.0 },
    );
    expect(avisos).toHaveLength(2);
  });

  it('clasifica correctamente según Tabla 2 y aplica umbrales de valores atípicos', () => {
    expect(clasificarIndicador('P_E', -3.5).codigo).toBe('PESO_BAJO_SEVERO');
    expect(clasificarIndicador('P_E', 0).codigo).toBe('NORMAL');
    expect(clasificarIndicador('T_E', -2.5).codigo).toBe('TALLA_BAJA');
    expect(clasificarIndicador('P_T', 2.4).codigo).toBe('SOBREPESO');
    expect(clasificarIndicador('IMC_E', 3.2).codigo).toBe('OBESIDAD');
    expect(clasificarIndicador('PC_E', -2.2).codigo).toBe('MICROCEFALIA');
    expect(clasificarIndicador('PC_E', 2.5).codigo).toBe('MACROCEFALIA');

    expect(esPuntajeZAtipico('T_E', -6.01)).toBe(true);
    expect(esPuntajeZAtipico('T_E', -5.99)).toBe(false);
    expect(esPuntajeZAtipico('P_E', -6.01)).toBe(true);
    expect(esPuntajeZAtipico('P_E', 5.01)).toBe(true);
    expect(esPuntajeZAtipico('P_E', -5.5)).toBe(false);
    expect(esPuntajeZAtipico('P_T', 5.01)).toBe(true);
  });
});
