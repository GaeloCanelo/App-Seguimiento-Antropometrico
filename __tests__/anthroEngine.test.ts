import casosReferencia from './fixtures/who_anthro_cases.json';
import {
  VERSION_MOTOR_ANTROPOMETRICO,
  ajustarLongitudTalla,
  calcularIMC,
  evaluarConsultaAntropometrica,
  formatearResultadoVisual,
} from '../src/domain/anthroEngine';
import { generarSerieCurvaReferencia } from '../src/domain/lmsLookup';
import { calcularZScoreLMS, zScoreToPercentile } from '../src/domain/mathStats';
import { CodigoIndicador, PosicionMedicion, Sexo } from '../src/domain/types';

function restarDiasIso(fechaFin: string, dias: number): string {
  const [y, m, d] = fechaFin.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - dias);
  return dt.toISOString().slice(0, 10);
}

describe('AnthroEngine — Validación contra referencias oficiales OMS / WHO Anthro (RNF-01)', () => {
  const FECHA_CONSULTA = '2026-11-17';

  it('mantiene diferencia absoluta menor a 0.01 puntos Z en todos los casos de referencia OMS', () => {
    for (const caso of casosReferencia) {
      const fechaNacimiento = restarDiasIso(FECHA_CONSULTA, caso.edad_dias);
      const salida = evaluarConsultaAntropometrica({
        sexo: caso.sexo as Sexo,
        fecha_nacimiento: fechaNacimiento,
        fecha_consulta: FECHA_CONSULTA,
        fecha_hoy: FECHA_CONSULTA,
        peso_kg: caso.peso_kg,
        longitud_talla_cm: caso.longitud_talla_cm,
        perimetro_cefalico_cm: caso.perimetro_cefalico_cm,
        posicion_medicion: caso.posicion_medicion as PosicionMedicion,
      });

      expect(salida.version_motor).toBe(VERSION_MOTOR_ANTROPOMETRICO);
      expect(salida.edad_dias).toBe(caso.edad_dias);
      expect(salida.longitud_talla_ajustada_cm).toBeCloseTo(caso.talla_ajustada_esperada, 2);
      expect(salida.resultados).toHaveLength(5);

      for (const codigo of ['P_E', 'T_E', 'P_T', 'PC_E', 'IMC_E'] as CodigoIndicador[]) {
        const res = salida.resultados.find((r) => r.codigo_indicador === codigo)!;
        const esperado = caso.expected_z[codigo];

        if (esperado === null) {
          expect(res.estado).toBe('NO_APLICA');
          expect(res.puntaje_z).toBeNull();
          expect(res.percentil).toBeNull();
          expect(res.motivo_no_aplica).toBeTruthy();
        } else {
          expect(res.estado).toBe('CALCULADO');
          expect(res.puntaje_z).not.toBeNull();
          expect(Math.abs((res.puntaje_z as number) - esperado)).toBeLessThan(0.01);
          expect(res.percentil).toBeGreaterThanOrEqual(0);
          expect(res.percentil).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('reproduce vectores puntuales publicados en la suite oficial worldhealthorganization/anthro', () => {
    // test-zscore-weight-for-age.R: niña, 1522 días, 17 kg -> Z P/E = 0.24
    const nina1522 = evaluarConsultaAntropometrica({
      sexo: 'F',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 1522),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 17,
      longitud_talla_cm: 105,
      perimetro_cefalico_cm: 49.5,
      posicion_medicion: 'DE_PIE',
    });
    const zPe = nina1522.resultados.find((r) => r.codigo_indicador === 'P_E')!.puntaje_z!;
    expect(Number(zPe.toFixed(2))).toBe(0.24);

    // test-zscore-length-for-age.R: niño, 44 días, 50 cm -> Z T/E = -3.29
    const nino44 = evaluarConsultaAntropometrica({
      sexo: 'M',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 44),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 4.0,
      longitud_talla_cm: 50,
      perimetro_cefalico_cm: 36,
      posicion_medicion: 'ACOSTADO',
    });
    const zTe44 = nino44.resultados.find((r) => r.codigo_indicador === 'T_E')!.puntaje_z!;
    expect(Number(zTe44.toFixed(2))).toBe(-3.29);

    // test-zscores.R: niña, 731 días (24m), 77.5 cm de pie -> Z T/E = -2.55
    const nina731 = evaluarConsultaAntropometrica({
      sexo: 'F',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 731),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 8.8,
      longitud_talla_cm: 77.5,
      perimetro_cefalico_cm: 46,
      posicion_medicion: 'DE_PIE',
    });
    const zTe731 = nina731.resultados.find((r) => r.codigo_indicador === 'T_E')!.puntaje_z!;
    expect(Number(zTe731.toFixed(2))).toBe(-2.55);

    // test-zscores.R: niño, 9 meses (274 días), 60 cm medido de pie -> ajusta a 60.7 cm -> Z T/E ≈ -5.02
    const nino274 = evaluarConsultaAntropometrica({
      sexo: 'M',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 274),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 6.5,
      longitud_talla_cm: 60,
      perimetro_cefalico_cm: 43,
      posicion_medicion: 'DE_PIE',
    });
    expect(nino274.longitud_talla_ajustada_cm).toBe(60.7);
    const zTe274 = nino274.resultados.find((r) => r.codigo_indicador === 'T_E')!.puntaje_z!;
    expect(Math.abs(zTe274 - -5.02)).toBeLessThan(0.02);
  });

  it('aplica ajuste por posición (±0.7 cm) exactamente en el corte de 731 días (24 meses)', () => {
    expect(ajustarLongitudTalla(82.0, 548, 'DE_PIE')).toEqual({
      tallaAjustadaCm: 82.7,
      ajusteCm: 0.7,
    });
    expect(ajustarLongitudTalla(82.0, 730, 'DE_PIE')).toEqual({
      tallaAjustadaCm: 82.7,
      ajusteCm: 0.7,
    });
    expect(ajustarLongitudTalla(86.0, 731, 'ACOSTADO')).toEqual({
      tallaAjustadaCm: 85.3,
      ajusteCm: -0.7,
    });
    expect(ajustarLongitudTalla(86.0, 731, 'DE_PIE')).toEqual({
      tallaAjustadaCm: 86.0,
      ajusteCm: 0,
    });
  });

  it('PA-02 y PA-03: calcula ajuste de talla y detecta valores atípicos biológicamente improbables', () => {
    // PA-02: 18 meses (~548d), peso 10.5, talla 82.0 de pie -> ajusta a 82.7 cm e IMC usa 82.7 cm
    const pa02 = evaluarConsultaAntropometrica({
      sexo: 'M',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 548),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 10.5,
      longitud_talla_cm: 82.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'DE_PIE',
    });
    expect(pa02.longitud_talla_ajustada_cm).toBe(82.7);
    expect(pa02.imc).toBeCloseTo(calcularIMC(10.5, 82.7), 6);
    expect(pa02.hay_atipicos).toBe(false);

    // PA-03: 12 meses (365d), peso 25.0 kg -> P/E > +5 Z -> marca atípico
    const pa03 = evaluarConsultaAntropometrica({
      sexo: 'M',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 365),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 25.0,
      longitud_talla_cm: 76.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'ACOSTADO',
    });
    const resPe = pa03.resultados.find((r) => r.codigo_indicador === 'P_E')!;
    expect(resPe.puntaje_z!).toBeGreaterThan(5);
    expect(resPe.es_atipico).toBe(true);
    expect(pa03.hay_atipicos).toBe(true);
  });

  it('usa la expresión logarítmica ln(X/M)/S cuando L = 0 (CU-16 5a) y convierte Z a percentil', () => {
    const z = calcularZScoreLMS(10, 0, 10, 0.1, false);
    expect(z).toBeCloseTo(0, 8);
    expect(zScoreToPercentile(0)).toBeCloseTo(50, 4);

    const zPos = calcularZScoreLMS(10 * Math.exp(0.1 * 2), 0, 10, 0.1, false);
    expect(zPos).toBeCloseTo(2, 8);
    expect(zScoreToPercentile(2)).toBeCloseTo(97.725, 2);
  });

  it('formatea Z a 2 decimales y percentil a 1 decimal, y maneja NO_APLICA (CU-17)', () => {
    const salida = evaluarConsultaAntropometrica({
      sexo: 'F',
      fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 800),
      fecha_consulta: FECHA_CONSULTA,
      fecha_hoy: FECHA_CONSULTA,
      peso_kg: 7.0,
      longitud_talla_cm: 60.0, // fuera de tabla TALLA (65..120 cm)
      perimetro_cefalico_cm: 45.0,
      posicion_medicion: 'DE_PIE',
    });
    const pt = salida.resultados.find((r) => r.codigo_indicador === 'P_T')!;
    expect(pt.estado).toBe('NO_APLICA');
    expect(formatearResultadoVisual(pt)).toEqual({
      puntajeZTexto: 'No aplica',
      percentilTexto: 'No aplica',
    });

    const pe = salida.resultados.find((r) => r.codigo_indicador === 'P_E')!;
    const fmt = formatearResultadoVisual(pe);
    expect(fmt.puntajeZTexto).toMatch(/^-?\d+\.\d{2}$/);
    expect(fmt.percentilTexto).toMatch(/^\d+\.\d$/);
  });

  it('genera series de curvas de referencia OMS para graficación (CU-18)', () => {
    const serieZ = generarSerieCurvaReferencia({
      indicador: 'P_E',
      sexo: 'M',
      zNiveles: [-3, -2, -1, 0, 1, 2, 3],
      pasoEje: 30,
    });
    expect(serieZ.eje[0]).toBe(0);
    expect(serieZ.curvas[0][0]).toBeCloseTo(3.3464, 4);
    expect(serieZ.curvas[3][0]).toBeGreaterThan(serieZ.curvas[0][0]);

    const seriePT = generarSerieCurvaReferencia({
      indicador: 'P_T',
      sexo: 'F',
      tipoTablaPT: 'LONGITUD',
      zNiveles: [0],
      pasoEje: 1,
    });
    expect(seriePT.eje[0]).toBe(45);
    expect(seriePT.eje[seriePT.eje.length - 1]).toBe(110);
  });

  it('cumple ampliamente con RNF-05 (< 1.5 segundos por evaluación)', () => {
    const inicio = performance.now();
    for (let i = 0; i < 100; i++) {
      evaluarConsultaAntropometrica({
        sexo: i % 2 === 0 ? 'M' : 'F',
        fecha_nacimiento: restarDiasIso(FECHA_CONSULTA, 500 + i),
        fecha_consulta: FECHA_CONSULTA,
        fecha_hoy: FECHA_CONSULTA,
        peso_kg: 10.5,
        longitud_talla_cm: 82.0,
        perimetro_cefalico_cm: 46.0,
        posicion_medicion: 'ACOSTADO',
      });
    }
    const duracionMs = performance.now() - inicio;
    expect(duracionMs).toBeLessThan(1500);
  });
});
