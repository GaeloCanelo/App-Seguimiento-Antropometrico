import conjuntoOmsJson from '../assets/who/conjunto_oms.json';
import tablasOmsJson from '../assets/who/oms_2006_lms.json';
import { DIAS_CORTE_24_MESES } from './ageAndValidation';
import { valorParaZScoreLMS } from './mathStats';
import { CodigoIndicador, ConjuntoOMS, Sexo, TipoTablaLMS } from './types';

export type TriplaLMS = readonly [number, number, number]; // [L, M, S]

interface TablaLenHei {
  minCm: number;
  maxCm: number;
  stepCm: number;
  data: Record<Sexo, TriplaLMS[]>;
}

interface BundleOMS {
  P_E: Record<Sexo, TriplaLMS[]>;
  T_E: Record<Sexo, TriplaLMS[]>;
  PC_E: Record<Sexo, TriplaLMS[]>;
  IMC_E: Record<Sexo, TriplaLMS[]>;
  P_T_LONGITUD: TablaLenHei;
  P_T_TALLA: TablaLenHei;
}

const TABLAS_OMS = tablasOmsJson as unknown as BundleOMS;

export const CONJUNTO_OMS_VIGENTE: ConjuntoOMS = conjuntoOmsJson;

export type ResultadoBusquedaLMS =
  | {
      aplica: true;
      tipo_tabla: TipoTablaLMS;
      l: number;
      m: number;
      s: number;
    }
  | {
      aplica: false;
      tipo_tabla: TipoTablaLMS;
      motivo: string;
    };

/** Obtiene los coeficientes LMS por día exacto (0..1826) para indicadores basados en edad. */
export function obtenerLMSPorEdad(
  indicador: Exclude<CodigoIndicador, 'P_T'>,
  sexo: Sexo,
  edadDias: number,
): ResultadoBusquedaLMS {
  const serie = TABLAS_OMS[indicador][sexo];
  if (edadDias < 0 || edadDias >= serie.length) {
    return {
      aplica: false,
      tipo_tabla: 'EDAD',
      motivo: `Edad (${edadDias} días) fuera del dominio OMS (0 a ${serie.length - 1} días).`,
    };
  }
  const [l, m, s] = serie[edadDias];
  return { aplica: true, tipo_tabla: 'EDAD', l, m, s };
}

/**
 * Obtiene los coeficientes LMS de Peso para Longitud/Talla (P_T) con interpolación
 * lineal entre incrementos de 0.1 cm (idéntico al algoritmo de WHO Anthro).
 */
export function obtenerLMSPesoParaLongitudTalla(
  sexo: Sexo,
  edadDias: number,
  tallaAjustadaCm: number,
): ResultadoBusquedaLMS {
  const esMenorDe24Meses = edadDias < DIAS_CORTE_24_MESES;
  const tipo_tabla: TipoTablaLMS = esMenorDe24Meses ? 'LONGITUD' : 'TALLA';
  const tabla = esMenorDe24Meses ? TABLAS_OMS.P_T_LONGITUD : TABLAS_OMS.P_T_TALLA;

  if (tallaAjustadaCm < tabla.minCm || tallaAjustadaCm > tabla.maxCm) {
    return {
      aplica: false,
      tipo_tabla,
      motivo: `Longitud/talla ajustada (${tallaAjustadaCm.toFixed(1)} cm) fuera del dominio de la tabla de ${tipo_tabla.toLowerCase()} (${tabla.minCm}–${tabla.maxCm} cm).`,
    };
  }

  const series = tabla.data[sexo];
  const lowTenths = Math.trunc(tallaAjustadaCm * 10 + 1e-9);
  const lowCm = lowTenths / 10;
  const diff = (tallaAjustadaCm - lowCm) / 0.1;

  const minTenths = Math.round(tabla.minCm * 10);
  const idxLow = lowTenths - minTenths;
  const [lLow, mLow, sLow] = series[idxLow];

  if (diff <= 1e-9 || idxLow + 1 >= series.length) {
    return { aplica: true, tipo_tabla, l: lLow, m: mLow, s: sLow };
  }

  const [lUpp, mUpp, sUpp] = series[idxLow + 1];
  return {
    aplica: true,
    tipo_tabla,
    l: lLow + diff * (lUpp - lLow),
    m: mLow + diff * (mUpp - mLow),
    s: sLow + diff * (sUpp - sLow),
  };
}

/**
 * Genera los puntos de las curvas de referencia oficiales de la OMS para graficación (CU-18).
 * Permite vista en puntajes Z (-3 a +3) o percentiles (P3, P15, P50, P85, P97).
 */
export function generarSerieCurvaReferencia(params: {
  indicador: CodigoIndicador;
  sexo: Sexo;
  tipoTablaPT?: 'LONGITUD' | 'TALLA';
  zNiveles: readonly number[];
  pasoEje?: number;
}): { eje: number[]; curvas: Record<number, number[]> } {
  const { indicador, sexo, zNiveles } = params;
  const curvas: Record<number, number[]> = {};
  for (const z of zNiveles) {
    curvas[z] = [];
  }

  const eje: number[] = [];

  if (indicador === 'P_T') {
    const tabla =
      params.tipoTablaPT === 'TALLA' ? TABLAS_OMS.P_T_TALLA : TABLAS_OMS.P_T_LONGITUD;
    const series = tabla.data[sexo];
    const pasoTenths = Math.max(1, Math.round((params.pasoEje ?? 0.5) * 10));
    const minTenths = Math.round(tabla.minCm * 10);

    for (let i = 0; i < series.length; i += pasoTenths) {
      const [l, m, s] = series[i];
      eje.push((minTenths + i) / 10);
      for (const z of zNiveles) {
        curvas[z].push(valorParaZScoreLMS(z, l, m, s));
      }
    }
    return { eje, curvas };
  }

  const series = TABLAS_OMS[indicador][sexo];
  const pasoDias = Math.max(1, Math.round(params.pasoEje ?? 15));
  for (let d = 0; d < series.length; d += pasoDias) {
    const [l, m, s] = series[d];
    eje.push(d);
    for (const z of zNiveles) {
      curvas[z].push(valorParaZScoreLMS(z, l, m, s));
    }
  }
  return { eje, curvas };
}
