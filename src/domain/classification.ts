import { CodigoIndicador } from './types';

export type SeveridadClasificacion = 'normal' | 'info' | 'alerta' | 'moderado' | 'severo';

export interface ClasificacionReferencial {
  codigo: string;
  etiqueta: string;
  severidad: SeveridadClasificacion;
  colorHex: string;
}

const COLORES: Record<SeveridadClasificacion, string> = {
  normal: '#2E7D32',
  info: '#1565C0',
  alerta: '#F9A825',
  moderado: '#EF6C00',
  severo: '#C62828',
};

function crearClasificacion(
  codigo: string,
  etiqueta: string,
  severidad: SeveridadClasificacion,
): ClasificacionReferencial {
  return { codigo, etiqueta, severidad, colorHex: COLORES[severidad] };
}

/**
 * Clasificación referencial según OMS (2006/2007) y NOM-031-SSA2-1999 (Tabla 2).
 * Nota: Uso informativo (CDSS); nunca equivale a un diagnóstico clínico concluyente.
 */
export function clasificarIndicador(
  indicador: CodigoIndicador,
  z: number,
): ClasificacionReferencial {
  switch (indicador) {
    case 'P_E':
      if (z < -3) return crearClasificacion('PESO_BAJO_SEVERO', 'Peso muy bajo para la edad', 'severo');
      if (z < -2) return crearClasificacion('PESO_BAJO', 'Peso bajo para la edad', 'moderado');
      if (z <= 1) return crearClasificacion('NORMAL', 'Peso normal para la edad', 'normal');
      if (z <= 2) return crearClasificacion('ALERTA_PESO_ALTO', 'Riesgo de peso elevado', 'alerta');
      return crearClasificacion('PESO_ALTO', 'Peso elevado para la edad', 'moderado');

    case 'T_E':
      if (z < -3) return crearClasificacion('TALLA_BAJA_SEVERA', 'Talla baja severa', 'severo');
      if (z < -2) return crearClasificacion('TALLA_BAJA', 'Talla baja', 'moderado');
      if (z <= 2) return crearClasificacion('NORMAL', 'Longitud/talla normal para la edad', 'normal');
      return crearClasificacion('TALLA_ALTA', 'Longitud/talla alta para la edad', 'info');

    case 'P_T':
    case 'IMC_E':
      if (z < -3) return crearClasificacion('EMACIACION_SEVERA', 'Emaciación severa', 'severo');
      if (z < -2) return crearClasificacion('EMACIACION', 'Emaciación', 'moderado');
      if (z <= 1) return crearClasificacion('NORMAL', 'Normal', 'normal');
      if (z <= 2) return crearClasificacion('RIESGO_SOBREPESO', 'Posible riesgo de sobrepeso', 'alerta');
      if (z <= 3) return crearClasificacion('SOBREPESO', 'Sobrepeso', 'moderado');
      return crearClasificacion('OBESIDAD', 'Obesidad', 'severo');

    case 'PC_E':
      if (z < -3) return crearClasificacion('MICROCEFALIA_SEVERA', 'Perímetro cefálico muy bajo (< -3 DE)', 'severo');
      if (z < -2) return crearClasificacion('MICROCEFALIA', 'Perímetro cefálico bajo (< -2 DE)', 'moderado');
      if (z <= 2) return crearClasificacion('NORMAL', 'Perímetro cefálico normal', 'normal');
      if (z <= 3) return crearClasificacion('MACROCEFALIA', 'Perímetro cefálico elevado (> +2 DE)', 'moderado');
      return crearClasificacion('MACROCEFALIA_SEVERA', 'Perímetro cefálico muy elevado (> +3 DE)', 'severo');
  }
}

/** Reglas de plausibilidad biológica OMS / WHO Anthro (HU-13, CU-15). */
export function esPuntajeZAtipico(indicador: CodigoIndicador, z: number): boolean {
  switch (indicador) {
    case 'T_E':
      return Math.abs(z) > 6;
    case 'P_E':
      return z < -6 || z > 5;
    case 'P_T':
    case 'IMC_E':
    case 'PC_E':
      return Math.abs(z) > 5;
  }
}
