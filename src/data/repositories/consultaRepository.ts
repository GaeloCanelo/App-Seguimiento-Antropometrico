import {
  Consulta,
  PosicionMedicion,
  ResultadoIndicador,
  evaluarConsultaAntropometrica,
} from '../../domain';
import { DatabaseAdapter } from '../database/types';
import { GeneradorUuid, ahoraUtcIso, generarUuidV4PorDefecto } from '../database/utils';
import { PacienteRepository } from './pacienteRepository';

export interface ConsultaConResultados {
  consulta: Consulta;
  resultados: ResultadoIndicador[];
}

interface ConsultaSqlRow extends Omit<Consulta, 'atipico_confirmado'> {
  atipico_confirmado: number;
}

interface ResultadoSqlRow extends Omit<ResultadoIndicador, 'es_atipico'> {
  es_atipico: number;
}

function mapConsultaRow(row: ConsultaSqlRow): Consulta {
  return {
    ...row,
    atipico_confirmado: row.atipico_confirmado === 1,
  };
}

function mapResultadoRow(row: ResultadoSqlRow): ResultadoIndicador {
  return {
    ...row,
    es_atipico: row.es_atipico === 1,
  };
}

export class ConsultaRepository {
  private readonly pacientes: PacienteRepository;

  constructor(
    private readonly db: DatabaseAdapter,
    private readonly generarUuid: GeneradorUuid = generarUuidV4PorDefecto,
  ) {
    this.pacientes = new PacienteRepository(db, generarUuid);
  }

  /** Verifica si ya existe una consulta activa en la misma fecha (CU-12 6a). */
  async existeConsultaEnFecha(idPaciente: string, fechaConsulta: string): Promise<boolean> {
    const fila = await this.db.getFirstAsync<{ id_consulta: string }>(
      `SELECT id_consulta FROM CONSULTA
       WHERE id_paciente = ? AND fecha_consulta = ? AND eliminado_en IS NULL
       LIMIT 1`,
      idPaciente,
      fechaConsulta,
    );
    return fila !== null;
  }

  /**
   * Registra la consulta y sus 5 resultados dentro de una única transacción atómica (CU-12).
   * Si hay valores atípicos y `atipico_confirmado` es false, lanza un aviso controlado con detalle.
   */
  async registrar(params: {
    id_paciente: string;
    fecha_consulta: string;
    peso_kg: number;
    longitud_talla_cm: number;
    perimetro_cefalico_cm: number;
    posicion_medicion: PosicionMedicion;
    atipico_confirmado?: boolean;
    fecha_hoy?: string;
  }): Promise<ConsultaConResultados> {
    const paciente = await this.pacientes.obtenerPorId(params.id_paciente);
    if (!paciente) {
      throw new Error('Paciente no encontrado.');
    }

    const evalSalida = evaluarConsultaAntropometrica({
      sexo: paciente.sexo,
      fecha_nacimiento: paciente.fecha_nacimiento,
      fecha_consulta: params.fecha_consulta,
      fecha_hoy: params.fecha_hoy,
      peso_kg: params.peso_kg,
      longitud_talla_cm: params.longitud_talla_cm,
      perimetro_cefalico_cm: params.perimetro_cefalico_cm,
      posicion_medicion: params.posicion_medicion,
    });

    const atipicoConfirmado = Boolean(params.atipico_confirmado && evalSalida.hay_atipicos);
    const idConsulta = this.generarUuid();
    const ahora = ahoraUtcIso();

    const consulta: Consulta = {
      id_consulta: idConsulta,
      id_paciente: paciente.id_paciente,
      id_conjunto: evalSalida.id_conjunto,
      fecha_consulta: params.fecha_consulta,
      peso_kg: params.peso_kg,
      longitud_talla_cm: params.longitud_talla_cm,
      perimetro_cefalico_cm: params.perimetro_cefalico_cm,
      posicion_medicion: params.posicion_medicion,
      edad_dias: evalSalida.edad_dias,
      longitud_talla_ajustada_cm: evalSalida.longitud_talla_ajustada_cm,
      imc: evalSalida.imc,
      atipico_confirmado: atipicoConfirmado,
      version_motor: evalSalida.version_motor,
      calculado_en: ahora,
      creado_en: ahora,
      actualizado_en: ahora,
      eliminado_en: null,
      estado_sync: 'PENDIENTE',
      revision_local: 1,
      revision_remota: null,
      confirmado_servidor_en: null,
    };

    const resultados: ResultadoIndicador[] = evalSalida.resultados.map((r) => ({
      id_consulta: idConsulta,
      codigo_indicador: r.codigo_indicador,
      estado: r.estado,
      puntaje_z: r.puntaje_z,
      percentil: r.percentil,
      clasificacion: r.clasificacion,
      es_atipico: r.es_atipico,
      motivo_no_aplica: r.motivo_no_aplica,
    }));

    await this.db.withExclusiveTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO CONSULTA (
          id_consulta, id_paciente, id_conjunto, fecha_consulta, peso_kg,
          longitud_talla_cm, perimetro_cefalico_cm, posicion_medicion, edad_dias,
          longitud_talla_ajustada_cm, imc, atipico_confirmado, version_motor,
          calculado_en, creado_en, actualizado_en, eliminado_en,
          estado_sync, revision_local, revision_remota, confirmado_servidor_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'PENDIENTE', 1, NULL, NULL)`,
        consulta.id_consulta,
        consulta.id_paciente,
        consulta.id_conjunto,
        consulta.fecha_consulta,
        consulta.peso_kg,
        consulta.longitud_talla_cm,
        consulta.perimetro_cefalico_cm,
        consulta.posicion_medicion,
        consulta.edad_dias,
        consulta.longitud_talla_ajustada_cm,
        consulta.imc,
        consulta.atipico_confirmado ? 1 : 0,
        consulta.version_motor,
        consulta.calculado_en,
        consulta.creado_en,
        consulta.actualizado_en,
      );

      for (const r of resultados) {
        await this.db.runAsync(
          `INSERT INTO RESULTADO_INDICADOR (
            id_consulta, codigo_indicador, estado, puntaje_z, percentil,
            clasificacion, es_atipico, motivo_no_aplica
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          r.id_consulta,
          r.codigo_indicador,
          r.estado,
          r.puntaje_z,
          r.percentil,
          r.clasificacion,
          r.es_atipico ? 1 : 0,
          r.motivo_no_aplica,
        );
      }
    });

    return { consulta, resultados };
  }

  /** Corrige mediciones de una consulta existente y recalcula los 5 resultados (CU-13). */
  async corregir(params: {
    id_consulta: string;
    fecha_consulta: string;
    peso_kg: number;
    longitud_talla_cm: number;
    perimetro_cefalico_cm: number;
    posicion_medicion: PosicionMedicion;
    atipico_confirmado?: boolean;
    fecha_hoy?: string;
  }): Promise<ConsultaConResultados> {
    const detalleActual = await this.obtenerDetallePorId(params.id_consulta);
    if (!detalleActual) {
      throw new Error('Consulta no encontrada.');
    }

    const paciente = await this.pacientes.obtenerPorId(detalleActual.consulta.id_paciente);
    if (!paciente) {
      throw new Error('Paciente asociado no encontrado.');
    }

    const evalSalida = evaluarConsultaAntropometrica({
      sexo: paciente.sexo,
      fecha_nacimiento: paciente.fecha_nacimiento,
      fecha_consulta: params.fecha_consulta,
      fecha_hoy: params.fecha_hoy,
      peso_kg: params.peso_kg,
      longitud_talla_cm: params.longitud_talla_cm,
      perimetro_cefalico_cm: params.perimetro_cefalico_cm,
      posicion_medicion: params.posicion_medicion,
    });

    const ahora = ahoraUtcIso();
    const nuevaRevision = detalleActual.consulta.revision_local + 1;
    const atipicoConfirmado = Boolean(params.atipico_confirmado && evalSalida.hay_atipicos);

    const resultados: ResultadoIndicador[] = evalSalida.resultados.map((r) => ({
      id_consulta: params.id_consulta,
      codigo_indicador: r.codigo_indicador,
      estado: r.estado,
      puntaje_z: r.puntaje_z,
      percentil: r.percentil,
      clasificacion: r.clasificacion,
      es_atipico: r.es_atipico,
      motivo_no_aplica: r.motivo_no_aplica,
    }));

    await this.db.withExclusiveTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE CONSULTA
         SET id_conjunto = ?, fecha_consulta = ?, peso_kg = ?, longitud_talla_cm = ?,
             perimetro_cefalico_cm = ?, posicion_medicion = ?, edad_dias = ?,
             longitud_talla_ajustada_cm = ?, imc = ?, atipico_confirmado = ?,
             version_motor = ?, calculado_en = ?, actualizado_en = ?,
             estado_sync = 'PENDIENTE', revision_local = ?
         WHERE id_consulta = ?`,
        evalSalida.id_conjunto,
        params.fecha_consulta,
        params.peso_kg,
        params.longitud_talla_cm,
        params.perimetro_cefalico_cm,
        params.posicion_medicion,
        evalSalida.edad_dias,
        evalSalida.longitud_talla_ajustada_cm,
        evalSalida.imc,
        atipicoConfirmado ? 1 : 0,
        evalSalida.version_motor,
        ahora,
        ahora,
        nuevaRevision,
        params.id_consulta,
      );

      for (const r of resultados) {
        await this.db.runAsync(
          `UPDATE RESULTADO_INDICADOR
           SET estado = ?, puntaje_z = ?, percentil = ?, clasificacion = ?,
               es_atipico = ?, motivo_no_aplica = ?
           WHERE id_consulta = ? AND codigo_indicador = ?`,
          r.estado,
          r.puntaje_z,
          r.percentil,
          r.clasificacion,
          r.es_atipico ? 1 : 0,
          r.motivo_no_aplica,
          r.id_consulta,
          r.codigo_indicador,
        );
      }
    });

    const consultaActualizada: Consulta = {
      ...detalleActual.consulta,
      id_conjunto: evalSalida.id_conjunto,
      fecha_consulta: params.fecha_consulta,
      peso_kg: params.peso_kg,
      longitud_talla_cm: params.longitud_talla_cm,
      perimetro_cefalico_cm: params.perimetro_cefalico_cm,
      posicion_medicion: params.posicion_medicion,
      edad_dias: evalSalida.edad_dias,
      longitud_talla_ajustada_cm: evalSalida.longitud_talla_ajustada_cm,
      imc: evalSalida.imc,
      atipico_confirmado: atipicoConfirmado,
      version_motor: evalSalida.version_motor,
      calculado_en: ahora,
      actualizado_en: ahora,
      estado_sync: 'PENDIENTE',
      revision_local: nuevaRevision,
    };

    return { consulta: consultaActualizada, resultados };
  }

  /** Lista las consultas activas del paciente ordenadas de más reciente a más antigua (CU-09). */
  async listarPorPaciente(idPaciente: string): Promise<Consulta[]> {
    const filas = await this.db.getAllAsync<ConsultaSqlRow>(
      `SELECT * FROM CONSULTA
       WHERE id_paciente = ? AND eliminado_en IS NULL
       ORDER BY fecha_consulta DESC, creado_en DESC`,
      idPaciente,
    );
    return filas.map(mapConsultaRow);
  }

  async obtenerDetallePorId(idConsulta: string): Promise<ConsultaConResultados | null> {
    const fila = await this.db.getFirstAsync<ConsultaSqlRow>(
      `SELECT * FROM CONSULTA WHERE id_consulta = ? AND eliminado_en IS NULL`,
      idConsulta,
    );
    if (!fila) return null;

    const resFilas = await this.db.getAllAsync<ResultadoSqlRow>(
      `SELECT * FROM RESULTADO_INDICADOR WHERE id_consulta = ?`,
      idConsulta,
    );
    return {
      consulta: mapConsultaRow(fila),
      resultados: resFilas.map(mapResultadoRow),
    };
  }

  /** Marca lógicamente la consulta como eliminada para ocultarla y sincronizar baja (CU-14). */
  async eliminarLogico(idConsulta: string): Promise<void> {
    const ahora = ahoraUtcIso();
    await this.db.runAsync(
      `UPDATE CONSULTA
       SET eliminado_en = ?, actualizado_en = ?, estado_sync = 'PENDIENTE',
           revision_local = revision_local + 1
       WHERE id_consulta = ? AND eliminado_en IS NULL`,
      ahora,
      ahora,
      idConsulta,
    );
  }
}
