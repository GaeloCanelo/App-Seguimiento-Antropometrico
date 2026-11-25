import { CodigoIndicador, Consulta, EstadoSyncDispositivo, Paciente, ResultadoIndicador } from '../../domain';
import { DatabaseAdapter } from '../database/types';
import { ahoraUtcIso, normalizarTextoBusqueda } from '../database/utils';
import { ConsultaRemotaDoc, PacienteRemotoDoc, RemoteSyncStore, ResumenSync } from './syncTypes';

interface PacientePendienteRow extends Paciente {
  folio_normalizado: string;
}

interface ConsultaPendienteRow extends Omit<Consulta, 'atipico_confirmado'> {
  atipico_confirmado: number;
}

interface ResultadoSqlRow extends Omit<ResultadoIndicador, 'es_atipico'> {
  es_atipico: number;
}

/**
 * Motor de sincronización bidireccional optimista (CU-20):
 * - Empuja altas, ediciones y bajas lógicas de SQLite a Cloud Firestore.
 * - Verifica `revision_local` antes de marcar `SINCRONIZADO` para no pisar ediciones concurrentes en UI.
 * - Descarga deltas remotos desde `cursor_remoto` resolviendo conflictos por marca temporal UTC más reciente.
 */
export class SyncService {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly remote: RemoteSyncStore,
  ) {}

  async obtenerEstadoDispositivo(
    uidMedico: string,
    idDispositivo: string,
  ): Promise<EstadoSyncDispositivo | null> {
    return this.db.getFirstAsync<EstadoSyncDispositivo>(
      `SELECT uid_medico, id_dispositivo, cursor_remoto, ultima_sincronizacion_en
       FROM ESTADO_SYNC WHERE uid_medico = ? AND id_dispositivo = ?`,
      uidMedico,
      idDispositivo,
    );
  }

  async sincronizar(params: {
    uid_medico: string;
    id_dispositivo: string;
    hayConexion: boolean;
  }): Promise<ResumenSync> {
    if (!params.hayConexion) {
      return {
        estado: 'SIN_CONEXION',
        enviadosPacientes: 0,
        enviadosConsultas: 0,
        descargadosPacientes: 0,
        descargadosConsultas: 0,
        errores: 0,
      };
    }

    let enviadosPacientes = 0;
    let enviadosConsultas = 0;
    let errores = 0;

    // 1. Subir pacientes pendientes (primero para respetar integridad lógica en remotos)
    const pacientesPendientes = await this.db.getAllAsync<PacientePendienteRow>(
      `SELECT * FROM PACIENTE
       WHERE uid_medico = ? AND estado_sync IN ('PENDIENTE', 'ERROR')
       ORDER BY actualizado_en ASC`,
      params.uid_medico,
    );

    for (const p of pacientesPendientes) {
      try {
        const revEnviada = p.revision_local;
        const doc: PacienteRemotoDoc = {
          id_paciente: p.id_paciente,
          uid_medico: p.uid_medico,
          folio_clinico: p.folio_clinico,
          nombre: p.nombre,
          sexo: p.sexo,
          fecha_nacimiento: p.fecha_nacimiento,
          creado_en: p.creado_en,
          actualizado_en: p.actualizado_en,
          eliminado_en: p.eliminado_en,
          revision_remota: (p.revision_remota ?? 0) + 1,
        };
        const ack = await this.remote.subirPaciente(params.uid_medico, doc);

        // Solo marca SINCRONIZADO si revision_local no cambió mientras se enviaba
        await this.db.runAsync(
          `UPDATE PACIENTE
           SET estado_sync = 'SINCRONIZADO', revision_remota = ?, confirmado_servidor_en = ?
           WHERE id_paciente = ? AND revision_local = ?`,
          ack.revisionRemota,
          ack.confirmadoEn,
          p.id_paciente,
          revEnviada,
        );
        enviadosPacientes += 1;
      } catch {
        errores += 1;
        await this.db.runAsync(
          `UPDATE PACIENTE SET estado_sync = 'ERROR' WHERE id_paciente = ?`,
          p.id_paciente,
        );
      }
    }

    // 2. Subir consultas pendientes junto con su mapa de 5 resultados
    const consultasPendientes = await this.db.getAllAsync<ConsultaPendienteRow>(
      `SELECT c.* FROM CONSULTA c
       INNER JOIN PACIENTE p ON p.id_paciente = c.id_paciente
       WHERE p.uid_medico = ? AND c.estado_sync IN ('PENDIENTE', 'ERROR')
       ORDER BY c.actualizado_en ASC`,
      params.uid_medico,
    );

    for (const c of consultasPendientes) {
      try {
        const revEnviada = c.revision_local;
        const resRows = await this.db.getAllAsync<ResultadoSqlRow>(
          `SELECT * FROM RESULTADO_INDICADOR WHERE id_consulta = ?`,
          c.id_consulta,
        );

        const mapaResultados = {} as Record<
          CodigoIndicador,
          Omit<ResultadoIndicador, 'id_consulta'>
        >;
        for (const r of resRows) {
          mapaResultados[r.codigo_indicador] = {
            codigo_indicador: r.codigo_indicador,
            estado: r.estado,
            puntaje_z: r.puntaje_z,
            percentil: r.percentil,
            clasificacion: r.clasificacion,
            es_atipico: r.es_atipico === 1,
            motivo_no_aplica: r.motivo_no_aplica,
          };
        }

        const doc: ConsultaRemotaDoc = {
          id_consulta: c.id_consulta,
          id_paciente: c.id_paciente,
          id_conjunto: c.id_conjunto,
          fecha_consulta: c.fecha_consulta,
          peso_kg: c.peso_kg,
          longitud_talla_cm: c.longitud_talla_cm,
          perimetro_cefalico_cm: c.perimetro_cefalico_cm,
          posicion_medicion: c.posicion_medicion,
          edad_dias: c.edad_dias,
          longitud_talla_ajustada_cm: c.longitud_talla_ajustada_cm,
          imc: c.imc,
          atipico_confirmado: c.atipico_confirmado === 1,
          version_motor: c.version_motor,
          calculado_en: c.calculado_en,
          creado_en: c.creado_en,
          actualizado_en: c.actualizado_en,
          eliminado_en: c.eliminado_en,
          revision_remota: (c.revision_remota ?? 0) + 1,
          resultados: mapaResultados,
        };

        const ack = await this.remote.subirConsulta(params.uid_medico, doc);
        await this.db.runAsync(
          `UPDATE CONSULTA
           SET estado_sync = 'SINCRONIZADO', revision_remota = ?, confirmado_servidor_en = ?
           WHERE id_consulta = ? AND revision_local = ?`,
          ack.revisionRemota,
          ack.confirmadoEn,
          c.id_consulta,
          revEnviada,
        );
        enviadosConsultas += 1;
      } catch {
        errores += 1;
        await this.db.runAsync(
          `UPDATE CONSULTA SET estado_sync = 'ERROR' WHERE id_consulta = ?`,
          c.id_consulta,
        );
      }
    }

    // 3. Descargar deltas desde cursor_remoto (o descarga completa si cursor es NULL)
    const estadoDisp = await this.obtenerEstadoDispositivo(
      params.uid_medico,
      params.id_dispositivo,
    );
    const delta = await this.remote.descargarCambios(
      params.uid_medico,
      estadoDisp?.cursor_remoto ?? null,
    );

    let descargadosPacientes = 0;
    let descargadosConsultas = 0;
    const ahora = ahoraUtcIso();

    await this.db.withExclusiveTransactionAsync(async () => {
      for (const remP of delta.pacientes) {
        const aplicado = await this.aplicarPacienteRemoto(remP, ahora);
        if (aplicado) descargadosPacientes += 1;
      }

      for (const remC of delta.consultas) {
        const aplicado = await this.aplicarConsultaRemota(remC, ahora);
        if (aplicado) descargadosConsultas += 1;
      }

      await this.db.runAsync(
        `INSERT INTO ESTADO_SYNC (uid_medico, id_dispositivo, cursor_remoto, ultima_sincronizacion_en)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(uid_medico, id_dispositivo) DO UPDATE SET
           cursor_remoto = excluded.cursor_remoto,
           ultima_sincronizacion_en = excluded.ultima_sincronizacion_en`,
        params.uid_medico,
        params.id_dispositivo,
        delta.nuevoCursor ?? estadoDisp?.cursor_remoto ?? null,
        ahora,
      );
    });

    return {
      estado: errores > 0 ? 'ERROR' : 'SINCRONIZADO',
      enviadosPacientes,
      enviadosConsultas,
      descargadosPacientes,
      descargadosConsultas,
      errores,
    };
  }

  private async aplicarPacienteRemoto(rem: PacienteRemotoDoc, ahora: string): Promise<boolean> {
    const local = await this.db.getFirstAsync<{
      actualizado_en: string;
      estado_sync: string;
      revision_local: number;
    }>(
      `SELECT actualizado_en, estado_sync, revision_local FROM PACIENTE WHERE id_paciente = ?`,
      rem.id_paciente,
    );

    // Regla CU-20 (6a): Si existe localmente con cambio pendiente más reciente, prevalece el local
    if (local && local.estado_sync !== 'SINCRONIZADO' && local.actualizado_en > rem.actualizado_en) {
      return false;
    }
    if (local && local.actualizado_en >= rem.actualizado_en && local.estado_sync === 'SINCRONIZADO') {
      return false;
    }

    const folioNorm = normalizarTextoBusqueda(rem.folio_clinico);
    const nombreNorm = normalizarTextoBusqueda(rem.nombre);

    if (!local) {
      await this.db.runAsync(
        `INSERT INTO PACIENTE (
          id_paciente, uid_medico, folio_clinico, folio_normalizado, nombre, nombre_normalizado,
          sexo, fecha_nacimiento, creado_en, actualizado_en, eliminado_en,
          estado_sync, revision_local, revision_remota, confirmado_servidor_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SINCRONIZADO', 1, ?, ?)`,
        rem.id_paciente,
        rem.uid_medico,
        rem.folio_clinico,
        folioNorm,
        rem.nombre,
        nombreNorm,
        rem.sexo,
        rem.fecha_nacimiento,
        rem.creado_en,
        rem.actualizado_en,
        rem.eliminado_en,
        rem.revision_remota,
        ahora,
      );
    } else {
      await this.db.runAsync(
        `UPDATE PACIENTE
         SET folio_clinico = ?, folio_normalizado = ?, nombre = ?, nombre_normalizado = ?,
             sexo = ?, fecha_nacimiento = ?, actualizado_en = ?, eliminado_en = ?,
             estado_sync = 'SINCRONIZADO', revision_remota = ?, confirmado_servidor_en = ?
         WHERE id_paciente = ?`,
        rem.folio_clinico,
        folioNorm,
        rem.nombre,
        nombreNorm,
        rem.sexo,
        rem.fecha_nacimiento,
        rem.actualizado_en,
        rem.eliminado_en,
        rem.revision_remota,
        ahora,
        rem.id_paciente,
      );
    }
    return true;
  }

  private async aplicarConsultaRemota(rem: ConsultaRemotaDoc, ahora: string): Promise<boolean> {
    const local = await this.db.getFirstAsync<{
      actualizado_en: string;
      estado_sync: string;
    }>(
      `SELECT actualizado_en, estado_sync FROM CONSULTA WHERE id_consulta = ?`,
      rem.id_consulta,
    );

    if (local && local.estado_sync !== 'SINCRONIZADO' && local.actualizado_en > rem.actualizado_en) {
      return false;
    }
    if (local && local.actualizado_en >= rem.actualizado_en && local.estado_sync === 'SINCRONIZADO') {
      return false;
    }

    if (!local) {
      await this.db.runAsync(
        `INSERT INTO CONSULTA (
          id_consulta, id_paciente, id_conjunto, fecha_consulta, peso_kg,
          longitud_talla_cm, perimetro_cefalico_cm, posicion_medicion, edad_dias,
          longitud_talla_ajustada_cm, imc, atipico_confirmado, version_motor,
          calculado_en, creado_en, actualizado_en, eliminado_en,
          estado_sync, revision_local, revision_remota, confirmado_servidor_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SINCRONIZADO', 1, ?, ?)`,
        rem.id_consulta,
        rem.id_paciente,
        rem.id_conjunto,
        rem.fecha_consulta,
        rem.peso_kg,
        rem.longitud_talla_cm,
        rem.perimetro_cefalico_cm,
        rem.posicion_medicion,
        rem.edad_dias,
        rem.longitud_talla_ajustada_cm,
        rem.imc,
        rem.atipico_confirmado ? 1 : 0,
        rem.version_motor,
        rem.calculado_en,
        rem.creado_en,
        rem.actualizado_en,
        rem.eliminado_en,
        rem.revision_remota,
        ahora,
      );
    } else {
      await this.db.runAsync(
        `UPDATE CONSULTA
         SET id_conjunto = ?, fecha_consulta = ?, peso_kg = ?, longitud_talla_cm = ?,
             perimetro_cefalico_cm = ?, posicion_medicion = ?, edad_dias = ?,
             longitud_talla_ajustada_cm = ?, imc = ?, atipico_confirmado = ?,
             version_motor = ?, calculado_en = ?, actualizado_en = ?, eliminado_en = ?,
             estado_sync = 'SINCRONIZADO', revision_remota = ?, confirmado_servidor_en = ?
         WHERE id_consulta = ?`,
        rem.id_conjunto,
        rem.fecha_consulta,
        rem.peso_kg,
        rem.longitud_talla_cm,
        rem.perimetro_cefalico_cm,
        rem.posicion_medicion,
        rem.edad_dias,
        rem.longitud_talla_ajustada_cm,
        rem.imc,
        rem.atipico_confirmado ? 1 : 0,
        rem.version_motor,
        rem.calculado_en,
        rem.actualizado_en,
        rem.eliminado_en,
        rem.revision_remota,
        ahora,
        rem.id_consulta,
      );
    }

    for (const r of Object.values(rem.resultados)) {
      await this.db.runAsync(
        `INSERT INTO RESULTADO_INDICADOR (
          id_consulta, codigo_indicador, estado, puntaje_z, percentil,
          clasificacion, es_atipico, motivo_no_aplica
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_consulta, codigo_indicador) DO UPDATE SET
          estado = excluded.estado,
          puntaje_z = excluded.puntaje_z,
          percentil = excluded.percentil,
          clasificacion = excluded.clasificacion,
          es_atipico = excluded.es_atipico,
          motivo_no_aplica = excluded.motivo_no_aplica`,
        rem.id_consulta,
        r.codigo_indicador,
        r.estado,
        r.puntaje_z,
        r.percentil,
        r.clasificacion,
        r.es_atipico ? 1 : 0,
        r.motivo_no_aplica,
      );
    }

    return true;
  }
}
