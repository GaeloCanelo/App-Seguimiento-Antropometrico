import { CodigoIndicador, Consulta, Medico, Paciente, ResultadoIndicador } from '../../domain';

export interface PacienteRemotoDoc {
  id_paciente: string;
  uid_medico: string;
  folio_clinico: string;
  nombre: string;
  sexo: Paciente['sexo'];
  fecha_nacimiento: string;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
  revision_remota: number;
}

export interface ConsultaRemotaDoc {
  id_consulta: string;
  id_paciente: string;
  id_conjunto: string;
  fecha_consulta: string;
  peso_kg: number;
  longitud_talla_cm: number;
  perimetro_cefalico_cm: number;
  posicion_medicion: Consulta['posicion_medicion'];
  edad_dias: number;
  longitud_talla_ajustada_cm: number;
  imc: number;
  atipico_confirmado: boolean;
  version_motor: string;
  calculado_en: string;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
  revision_remota: number;
  resultados: Record<CodigoIndicador, Omit<ResultadoIndicador, 'id_consulta'>>;
}

export interface CambiosRemotosDelta {
  pacientes: PacienteRemotoDoc[];
  consultas: ConsultaRemotaDoc[];
  nuevoCursor: string | null;
}

/** Contrato de acceso remoto (Cloud Firestore o mock en memoria para pruebas). */
export interface RemoteSyncStore {
  guardarPerfilMedico(medico: Medico): Promise<void>;
  obtenerPerfilMedico(uidMedico: string): Promise<Medico | null>;
  subirPaciente(uidMedico: string, doc: PacienteRemotoDoc): Promise<{ revisionRemota: number; confirmadoEn: string }>;
  subirConsulta(uidMedico: string, doc: ConsultaRemotaDoc): Promise<{ revisionRemota: number; confirmadoEn: string }>;
  descargarCambios(uidMedico: string, cursorRemoto: string | null): Promise<CambiosRemotosDelta>;
  eliminarTodoDeMedico(uidMedico: string): Promise<void>;
}

export type EstadoGlobalSync = 'SIN_CONEXION' | 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface ResumenSync {
  estado: EstadoGlobalSync;
  enviadosPacientes: number;
  enviadosConsultas: number;
  descargadosPacientes: number;
  descargadosConsultas: number;
  errores: number;
}
