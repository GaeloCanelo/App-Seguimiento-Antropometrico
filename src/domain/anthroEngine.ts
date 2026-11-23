import {
  DIAS_CORTE_24_MESES,
  calcularEdadEnDias,
  formatearEdadMesesYDias,
  validarMedicionesConsulta,
} from './ageAndValidation';
import {
  ClasificacionReferencial,
  clasificarIndicador,
  esPuntajeZAtipico,
} from './classification';
import {
  CONJUNTO_OMS_VIGENTE,
  ResultadoBusquedaLMS,
  obtenerLMSPesoParaLongitudTalla,
  obtenerLMSPorEdad,
} from './lmsLookup';
import { calcularZScoreLMS, zScoreToPercentile } from './mathStats';
import { CodigoIndicador, EstadoResultado, PosicionMedicion, Sexo } from './types';

export const VERSION_MOTOR_ANTROPOMETRICO = 'OMS-2006-v1.0.0';

export interface EntradaCalculoConsulta {
  sexo: Sexo;
  fecha_nacimiento: string;
  fecha_consulta: string;
  peso_kg: number;
  longitud_talla_cm: number;
  perimetro_cefalico_cm: number;
  posicion_medicion: PosicionMedicion;
  fecha_hoy?: string;
}

export interface ResultadoIndicadorCalculado {
  codigo_indicador: CodigoIndicador;
  estado: EstadoResultado;
  puntaje_z: number | null;
  percentil: number | null;
  clasificacion: string | null;
  clasificacion_detalle: ClasificacionReferencial | null;
  es_atipico: boolean;
  motivo_no_aplica: string | null;
}

export interface SalidaEvaluacionConsulta {
  id_conjunto: string;
  version_motor: string;
  edad_dias: number;
  edad_texto: string;
  longitud_talla_ajustada_cm: number;
  ajuste_aplicado_cm: number;
  imc: number;
  hay_atipicos: boolean;
  resultados: ResultadoIndicadorCalculado[];
}

/**
 * Regla de ajuste OMS / CU-16:
 * - Menor de 24 meses (< 731 días) medido de pie: +0.7 cm.
 * - 24 meses o más (>= 731 días) medido acostado: -0.7 cm.
 */
export function ajustarLongitudTalla(
  longitudTallaCm: number,
  edadDias: number,
  posicion: PosicionMedicion,
): { tallaAjustadaCm: number; ajusteCm: number } {
  let ajusteCm = 0;
  if (edadDias < DIAS_CORTE_24_MESES && posicion === 'DE_PIE') {
    ajusteCm = 0.7;
  } else if (edadDias >= DIAS_CORTE_24_MESES && posicion === 'ACOSTADO') {
    ajusteCm = -0.7;
  }
  const tallaAjustadaCm = Math.round((longitudTallaCm + ajusteCm) * 100) / 100;
  return { tallaAjustadaCm, ajusteCm };
}

/** Calcula el IMC (kg/m²) a partir del peso en kg y la longitud/talla ajustada en cm. */
export function calcularIMC(pesoKg: number, tallaAjustadaCm: number): number {
  const tallaMetros = tallaAjustadaCm / 100;
  return pesoKg / (tallaMetros * tallaMetros);
}

function evaluarIndicador(params: {
  codigo: CodigoIndicador;
  valorObservado: number;
  busqueda: ResultadoBusquedaLMS;
  ajustarExtremos: boolean;
}): ResultadoIndicadorCalculado {
  const { codigo, valorObservado, busqueda, ajustarExtremos } = params;

  if (!busqueda.aplica) {
    return {
      codigo_indicador: codigo,
      estado: 'NO_APLICA',
      puntaje_z: null,
      percentil: null,
      clasificacion: null,
      clasificacion_detalle: null,
      es_atipico: false,
      motivo_no_aplica: busqueda.motivo,
    };
  }

  const puntajeZ = calcularZScoreLMS(
    valorObservado,
    busqueda.l,
    busqueda.m,
    busqueda.s,
    ajustarExtremos,
  );
  const percentil = zScoreToPercentile(puntajeZ);
  const detalle = clasificarIndicador(codigo, puntajeZ);
  const esAtipico = esPuntajeZAtipico(codigo, puntajeZ);

  return {
    codigo_indicador: codigo,
    estado: 'CALCULADO',
    puntaje_z: puntajeZ,
    percentil,
    clasificacion: detalle.codigo,
    clasificacion_detalle: detalle,
    es_atipico: esAtipico,
    motivo_no_aplica: null,
  };
}

/** Formatea puntajes Z (2 decimales) y percentiles (1 decimal) para visualización (CU-17). */
export function formatearResultadoVisual(resultado: ResultadoIndicadorCalculado): {
  puntajeZTexto: string;
  percentilTexto: string;
} {
  if (resultado.estado === 'NO_APLICA' || resultado.puntaje_z === null || resultado.percentil === null) {
    return { puntajeZTexto: 'No aplica', percentilTexto: 'No aplica' };
  }
  return {
    puntajeZTexto: resultado.puntaje_z.toFixed(2),
    percentilTexto: resultado.percentil.toFixed(1),
  };
}

/**
 * Motor antropométrico determinista de los 5 indicadores de la OMS (CU-16).
 * Conserva precisión completa en los cálculos para almacenamiento en SQLite.
 */
export function evaluarConsultaAntropometrica(
  entrada: EntradaCalculoConsulta,
): SalidaEvaluacionConsulta {
  const errores = validarMedicionesConsulta(entrada);
  if (errores.length > 0) {
    throw new Error(errores.map((e) => `${e.campo}: ${e.mensaje}`).join(' '));
  }

  const edadDias = calcularEdadEnDias(entrada.fecha_nacimiento, entrada.fecha_consulta);
  const { texto: edadTexto } = formatearEdadMesesYDias(
    entrada.fecha_nacimiento,
    entrada.fecha_consulta,
  );
  const { tallaAjustadaCm, ajusteCm } = ajustarLongitudTalla(
    entrada.longitud_talla_cm,
    edadDias,
    entrada.posicion_medicion,
  );
  const imc = calcularIMC(entrada.peso_kg, tallaAjustadaCm);

  const resultados: ResultadoIndicadorCalculado[] = [
    evaluarIndicador({
      codigo: 'P_E',
      valorObservado: entrada.peso_kg,
      busqueda: obtenerLMSPorEdad('P_E', entrada.sexo, edadDias),
      ajustarExtremos: true,
    }),
    evaluarIndicador({
      codigo: 'T_E',
      valorObservado: tallaAjustadaCm,
      busqueda: obtenerLMSPorEdad('T_E', entrada.sexo, edadDias),
      ajustarExtremos: false,
    }),
    evaluarIndicador({
      codigo: 'P_T',
      valorObservado: entrada.peso_kg,
      busqueda: obtenerLMSPesoParaLongitudTalla(entrada.sexo, edadDias, tallaAjustadaCm),
      ajustarExtremos: true,
    }),
    evaluarIndicador({
      codigo: 'PC_E',
      valorObservado: entrada.perimetro_cefalico_cm,
      busqueda: obtenerLMSPorEdad('PC_E', entrada.sexo, edadDias),
      ajustarExtremos: false,
    }),
    evaluarIndicador({
      codigo: 'IMC_E',
      valorObservado: imc,
      busqueda: obtenerLMSPorEdad('IMC_E', entrada.sexo, edadDias),
      ajustarExtremos: true,
    }),
  ];

  return {
    id_conjunto: CONJUNTO_OMS_VIGENTE.id_conjunto,
    version_motor: VERSION_MOTOR_ANTROPOMETRICO,
    edad_dias: edadDias,
    edad_texto: edadTexto,
    longitud_talla_ajustada_cm: tallaAjustadaCm,
    ajuste_aplicado_cm: ajusteCm,
    imc,
    hay_atipicos: resultados.some((r) => r.es_atipico),
    resultados,
  };
}
