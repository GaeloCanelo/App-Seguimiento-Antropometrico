import { PosicionMedicion } from './types';

export const DIAS_CORTE_24_MESES = 731;
export const EDAD_MAX_DIAS_OMS = 1826; // 0 a 60 meses exactos (tabla OMS 0..1826 días)

const MS_POR_DIA = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface ErrorValidacionCampo {
  campo: string;
  mensaje: string;
}

export interface EntradaConsultaValidacion {
  fecha_nacimiento: string;
  fecha_consulta: string;
  peso_kg: number;
  longitud_talla_cm: number;
  perimetro_cefalico_cm: number;
  posicion_medicion: PosicionMedicion;
  fecha_hoy?: string;
}

/** Parsea una fecha AAAA-MM-DD en UTC estricto evitando desfases por zona horaria. */
export function parseIsoDateUtc(fechaIso: string): Date | null {
  const match = ISO_DATE_RE.exec(fechaIso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Calcula la edad cronológica exacta en días calendario entre nacimiento y consulta. */
export function calcularEdadEnDias(fechaNacimiento: string, fechaConsulta: string): number {
  const nac = parseIsoDateUtc(fechaNacimiento);
  const con = parseIsoDateUtc(fechaConsulta);
  if (!nac || !con) {
    throw new Error('Formato de fecha inválido; se esperaba AAAA-MM-DD.');
  }
  return Math.round((con.getTime() - nac.getTime()) / MS_POR_DIA);
}

/** Formatea una diferencia entre fechas como meses calendario completos y días restantes. */
export function formatearEdadMesesYDias(
  fechaNacimiento: string,
  fechaConsulta: string,
): { meses: number; dias: number; texto: string } {
  const nac = parseIsoDateUtc(fechaNacimiento);
  const con = parseIsoDateUtc(fechaConsulta);
  if (!nac || !con || con.getTime() < nac.getTime()) {
    throw new Error('Fechas inválidas para formatear la edad.');
  }

  let meses =
    (con.getUTCFullYear() - nac.getUTCFullYear()) * 12 +
    (con.getUTCMonth() - nac.getUTCMonth());
  let dias = con.getUTCDate() - nac.getUTCDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(
      Date.UTC(con.getUTCFullYear(), con.getUTCMonth(), 0),
    ).getUTCDate();
    dias = ultimoDiaMesAnterior - nac.getUTCDate() + con.getUTCDate();
  }

  const texto = `${meses} ${meses === 1 ? 'mes' : 'meses'} y ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return { meses, dias, texto };
}

/** Sugiere posición según CU-12: acostado si < 24 meses (< 731 días), de pie si >= 24 meses. */
export function sugerirPosicionMedicion(edadDias: number): PosicionMedicion {
  return edadDias < DIAS_CORTE_24_MESES ? 'ACOSTADO' : 'DE_PIE';
}

function contarDecimales(valor: number): number {
  if (!Number.isFinite(valor)) return Infinity;
  const texto = valor.toString();
  if (texto.includes('e-')) {
    const [, exp] = texto.split('e-');
    return Number(exp);
  }
  const partes = texto.split('.');
  return partes[1] ? partes[1].length : 0;
}

/** Valida los datos de registro de un paciente según CU-07 (edad de 0 a 60 meses). */
export function validarPacienteDatos(params: {
  folio_clinico: string;
  nombre: string;
  fecha_nacimiento: string;
  fecha_hoy?: string;
}): ErrorValidacionCampo[] {
  const errores: ErrorValidacionCampo[] = [];

  if (!params.folio_clinico.trim()) {
    errores.push({ campo: 'folio_clinico', mensaje: 'El folio clínico es obligatorio.' });
  }
  if (!params.nombre.trim()) {
    errores.push({ campo: 'nombre', mensaje: 'El nombre del paciente es obligatorio.' });
  }

  const nac = parseIsoDateUtc(params.fecha_nacimiento);
  const hoyStr = params.fecha_hoy ?? new Date().toISOString().slice(0, 10);
  const hoy = parseIsoDateUtc(hoyStr);

  if (!nac) {
    errores.push({
      campo: 'fecha_nacimiento',
      mensaje: 'Fecha de nacimiento inválida (use AAAA-MM-DD).',
    });
  } else if (hoy) {
    const dias = Math.round((hoy.getTime() - nac.getTime()) / MS_POR_DIA);
    if (dias < 0) {
      errores.push({
        campo: 'fecha_nacimiento',
        mensaje: 'La fecha de nacimiento no puede ser futura.',
      });
    } else if (dias > EDAD_MAX_DIAS_OMS) {
      errores.push({
        campo: 'fecha_nacimiento',
        mensaje: 'El paciente supera los 60 meses (fuera del alcance de la aplicación).',
      });
    }
  }

  return errores;
}

/** Valida fechas y rangos fisiológicos de una consulta según CU-12 y CU-15. */
export function validarMedicionesConsulta(
  entrada: EntradaConsultaValidacion,
): ErrorValidacionCampo[] {
  const errores: ErrorValidacionCampo[] = [];
  const nac = parseIsoDateUtc(entrada.fecha_nacimiento);
  const con = parseIsoDateUtc(entrada.fecha_consulta);
  const hoyStr = entrada.fecha_hoy ?? new Date().toISOString().slice(0, 10);
  const hoy = parseIsoDateUtc(hoyStr);

  if (!nac) {
    errores.push({ campo: 'fecha_nacimiento', mensaje: 'Fecha de nacimiento inválida.' });
  }
  if (!con) {
    errores.push({ campo: 'fecha_consulta', mensaje: 'Fecha de consulta inválida.' });
  } else {
    if (hoy && con.getTime() > hoy.getTime()) {
      errores.push({
        campo: 'fecha_consulta',
        mensaje: 'La fecha de consulta no puede ser futura.',
      });
    }
    if (nac) {
      const edadDias = Math.round((con.getTime() - nac.getTime()) / MS_POR_DIA);
      if (edadDias < 0) {
        errores.push({
          campo: 'fecha_consulta',
          mensaje: 'La fecha de consulta no puede ser anterior al nacimiento.',
        });
      } else if (edadDias > EDAD_MAX_DIAS_OMS) {
        errores.push({
          campo: 'fecha_consulta',
          mensaje: 'La edad en la fecha de consulta supera los 60 meses.',
        });
      }
    }
  }

  if (
    !Number.isFinite(entrada.peso_kg) ||
    entrada.peso_kg < 0.5 ||
    entrada.peso_kg > 50 ||
    contarDecimales(entrada.peso_kg) > 2
  ) {
    errores.push({
      campo: 'peso_kg',
      mensaje: 'El peso debe estar entre 0.5 y 50 kg con máximo 2 decimales.',
    });
  }

  if (
    !Number.isFinite(entrada.longitud_talla_cm) ||
    entrada.longitud_talla_cm < 35 ||
    entrada.longitud_talla_cm > 140 ||
    contarDecimales(entrada.longitud_talla_cm) > 1
  ) {
    errores.push({
      campo: 'longitud_talla_cm',
      mensaje: 'La longitud/talla debe estar entre 35 y 140 cm con máximo 1 decimal.',
    });
  }

  if (
    !Number.isFinite(entrada.perimetro_cefalico_cm) ||
    entrada.perimetro_cefalico_cm < 25 ||
    entrada.perimetro_cefalico_cm > 60 ||
    contarDecimales(entrada.perimetro_cefalico_cm) > 1
  ) {
    errores.push({
      campo: 'perimetro_cefalico_cm',
      mensaje: 'El perímetro cefálico debe estar entre 25 y 60 cm con máximo 1 decimal.',
    });
  }

  return errores;
}

/** Aviso opcional CU-15 (4b): detecta decremento > 1 cm respecto a la consulta previa. */
export function detectarDecrementoMedida(
  anterior: { longitud_talla_cm: number; perimetro_cefalico_cm: number },
  actual: { longitud_talla_cm: number; perimetro_cefalico_cm: number },
): string[] {
  const avisos: string[] = [];
  if (anterior.longitud_talla_cm - actual.longitud_talla_cm > 1) {
    avisos.push('La longitud/talla disminuyó más de 1 cm respecto a la consulta anterior.');
  }
  if (anterior.perimetro_cefalico_cm - actual.perimetro_cefalico_cm > 1) {
    avisos.push('El perímetro cefálico disminuyó más de 1 cm respecto a la consulta anterior.');
  }
  return avisos;
}
