import { Medico } from '../../domain';
import { DatabaseAdapter } from '../database/types';
import { ahoraUtcIso } from '../database/utils';

export class MedicoRepository {
  constructor(private readonly db: DatabaseAdapter) {}

  async guardarPerfil(params: {
    uid_medico: string;
    correo: string;
    nombre?: string | null;
    apellidos?: string | null;
  }): Promise<Medico> {
    const ahora = ahoraUtcIso();
    const existente = await this.obtenerPorUid(params.uid_medico);

    if (existente) {
      const nombre = params.nombre !== undefined ? params.nombre : existente.nombre;
      const apellidos = params.apellidos !== undefined ? params.apellidos : existente.apellidos;
      await this.db.runAsync(
        `UPDATE MEDICO
         SET correo = ?, nombre = ?, apellidos = ?, actualizado_en = ?
         WHERE uid_medico = ?`,
        params.correo,
        nombre,
        apellidos,
        ahora,
        params.uid_medico,
      );
      return {
        ...existente,
        correo: params.correo,
        nombre,
        apellidos,
        actualizado_en: ahora,
      };
    }

    const nuevo: Medico = {
      uid_medico: params.uid_medico,
      correo: params.correo,
      nombre: params.nombre ?? null,
      apellidos: params.apellidos ?? null,
      creado_en: ahora,
      actualizado_en: ahora,
    };

    await this.db.runAsync(
      `INSERT INTO MEDICO (uid_medico, correo, nombre, apellidos, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      nuevo.uid_medico,
      nuevo.correo,
      nuevo.nombre,
      nuevo.apellidos,
      nuevo.creado_en,
      nuevo.actualizado_en,
    );
    return nuevo;
  }

  async obtenerPorUid(uidMedico: string): Promise<Medico | null> {
    return this.db.getFirstAsync<Medico>(
      `SELECT uid_medico, correo, nombre, apellidos, creado_en, actualizado_en
       FROM MEDICO
       WHERE uid_medico = ?`,
      uidMedico,
    );
  }

  /** Verifica si existen pacientes o consultas pendientes/con error de sincronización (CU-05). */
  async contarCambiosPendientes(uidMedico: string): Promise<number> {
    const pac = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM PACIENTE
       WHERE uid_medico = ? AND estado_sync != 'SINCRONIZADO'`,
      uidMedico,
    );
    const con = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM CONSULTA c
       INNER JOIN PACIENTE p ON p.id_paciente = c.id_paciente
       WHERE p.uid_medico = ? AND c.estado_sync != 'SINCRONIZADO'`,
      uidMedico,
    );
    return (pac?.total ?? 0) + (con?.total ?? 0);
  }

  /**
   * Elimina toda la información clínica local del dispositivo (CU-05 / CU-06).
   * Conserva los catálogos inmutables (INDICADOR, CONJUNTO_OMS).
   */
  async limpiarDatosLocales(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM RESULTADO_INDICADOR');
      await this.db.runAsync('DELETE FROM CONSULTA');
      await this.db.runAsync('DELETE FROM PACIENTE');
      await this.db.runAsync('DELETE FROM ESTADO_SYNC');
      await this.db.runAsync('DELETE FROM MEDICO');
    });
  }
}
