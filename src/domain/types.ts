/**
 * Tipos y modelos del dominio clínico alineados al Diagrama de Clases y Diccionario de Datos.
 * Nota: Esta capa debe permanecer libre de dependencias de UI, SQLite o Firebase.
 */

export type Sexo = 'M' | 'F';

export type PosicionMedicion = 'ACOSTADO' | 'DE_PIE';

export type CodigoIndicador = 'P_E' | 'T_E' | 'P_T' | 'PC_E' | 'IMC_E';

export type TipoTablaLMS = 'EDAD' | 'LONGITUD' | 'TALLA';

export type EstadoResultado = 'CALCULADO' | 'NO_APLICA';

export type EstadoSync = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface CamposSync {
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
  estado_sync: EstadoSync;
  revision_local: number;
  revision_remota: number | null;
  confirmado_servidor_en: string | null;
}

export interface Medico {
  uid_medico: string;
  correo: string;
  nombre: string | null;
  apellidos: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Paciente extends CamposSync {
  id_paciente: string;
  uid_medico: string;
  folio_clinico: string;
  nombre: string;
  sexo: Sexo;
  fecha_nacimiento: string; // Formato AAAA-MM-DD
}

export interface Consulta extends CamposSync {
  id_consulta: string;
  id_paciente: string;
  id_conjunto: string;
  fecha_consulta: string; // Formato AAAA-MM-DD
  peso_kg: number;
  longitud_talla_cm: number;
  perimetro_cefalico_cm: number;
  posicion_medicion: PosicionMedicion;
  edad_dias: number;
  longitud_talla_ajustada_cm: number;
  imc: number;
  atipico_confirmado: boolean;
  version_motor: string;
  calculado_en: string;
}

export interface ResultadoIndicador {
  id_consulta: string;
  codigo_indicador: CodigoIndicador;
  estado: EstadoResultado;
  puntaje_z: number | null;
  percentil: number | null;
  clasificacion: string | null;
  es_atipico: boolean;
  motivo_no_aplica: string | null;
}

export interface IndicadorMeta {
  codigo_indicador: CodigoIndicador;
  nombre: string;
  unidad_medida: 'kg' | 'cm' | 'kg/m²';
}

export interface ConjuntoOMS {
  id_conjunto: string;
  version: string;
  fuente_url: string;
  hash_archivos: string;
  fecha_importacion: string;
}

export interface ParametroLMS {
  id_parametro: string;
  id_conjunto: string;
  codigo_indicador: CodigoIndicador;
  sexo: Sexo;
  tipo_tabla: TipoTablaLMS;
  valor_eje: number;
  l: number;
  m: number;
  s: number;
}

export interface EstadoSyncDispositivo {
  uid_medico: string;
  id_dispositivo: string;
  cursor_remoto: string | null;
  ultima_sincronizacion_en: string | null;
}

export const CATALOGO_INDICADORES: readonly IndicadorMeta[] = [
  { codigo_indicador: 'P_E', nombre: 'Peso para la edad', unidad_medida: 'kg' },
  { codigo_indicador: 'T_E', nombre: 'Longitud/talla para la edad', unidad_medida: 'cm' },
  { codigo_indicador: 'P_T', nombre: 'Peso para longitud/talla', unidad_medida: 'kg' },
  { codigo_indicador: 'PC_E', nombre: 'Perímetro cefálico para la edad', unidad_medida: 'cm' },
  { codigo_indicador: 'IMC_E', nombre: 'IMC para la edad', unidad_medida: 'kg/m²' },
] as const;
