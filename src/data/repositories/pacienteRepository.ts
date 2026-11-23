import {
  Consulta,
  Paciente,
  Sexo,
  evaluarConsultaAntropometrica,
  validarPacienteDatos,
} from '../../domain';
import { DatabaseAdapter } from '../database/types';
import {
  GeneradorUuid,
  ahoraUtcIso,
  generarUuidV4PorDefecto,
  normalizarTextoBusqueda,
} from '../database/utils';

interface ConsultaRow {
  id_consulta: string;
  id_paciente: string;
  fecha_consulta: string;
  peso_kg: number;
  longitud_talla_cm: number;
  perimetro_cefalico_cm: number;
  posicion_medicion: Consulta['posicion_medicion'];
  revision_local: number;
}

export class PacienteRepository {
  constructor(
    private readonly db: DatabaseAdapter,
    private readonly generarUuid: GeneradorUuid = generarUuidV4PorDefecto,
  ) {}

  async registrar(params: {
    uid_medico: string;
    folio_clinico: string;
    nombre: string;
    sexo: Sexo;
    fecha_nacimiento: string;
    fecha_hoy?: string;
  }): Promise<Paciente> {
    const errores = validarPacienteDatos({
      folio_clinico: params.folio_clinico,
      nombre: params.nombre,
      fecha_nacimiento: params.fecha_nacimiento,
      fecha_hoy: params.fecha_hoy,
    });
    if (errores.length > 0) {
      throw new Error(errores.map((e) => e.mensaje).join(' '));
    }

    const folioLimpio = params.folio_clinico.trim();
    const folioNorm = normalizarTextoBusqueda(folioLimpio);
    const nombreLimpio = params.nombre.trim();
    const nombreNorm = normalizarTextoBusqueda(nombreLimpio);

    const duplicado = await this.db.getFirstAsync<{ id_paciente: string }>(
      `SELECT id_paciente FROM PACIENTE
       WHERE uid_medico = ? AND folio_normalizado = ? AND eliminado_en IS NULL`,
      params.uid_medico,
      folioNorm,
    );
    if (duplicado) {
      throw new Error(`Ya existe un paciente activo con el folio "${folioLimpio}".`);
    }

    const ahora = ahoraUtcIso();
    const paciente: Paciente = {
      id_paciente: this.generarUuid(),
      uid_medico: params.uid_medico,
      folio_clinico: folioLimpio,
      nombre: nombreLimpio,
      sexo: params.sexo,
      fecha_nacimiento: params.fecha_nacimiento,
      creado_en: ahora,
      actualizado_en: ahora,
      eliminado_en: null,
      estado_sync: 'PENDIENTE',
      revision_local: 1,
      revision_remota: null,
      confirmado_servidor_en: null,
    };

    await this.db.runAsync(
      `INSERT INTO PACIENTE (
        id_paciente, uid_medico, folio_clinico, folio_normalizado, nombre, nombre_normalizado,
        sexo, fecha_nacimiento, creado_en, actualizado_en, eliminado_en,
        estado_sync, revision_local, revision_remota, confirmado_servidor_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'PENDIENTE', 1, NULL, NULL)`,
      paciente.id_paciente,
      paciente.uid_medico,
      paciente.folio_clinico,
      folioNorm,
      paciente.nombre,
      nombreNorm,
      paciente.sexo,
      paciente.fecha_nacimiento,
      paciente.creado_en,
      paciente.actualizado_en,
    );

    return paciente;
  }

  /** Búsqueda parcial por folio o nombre, insensible a mayúsculas y acentos (CU-08). */
  async buscar(uidMedico: string, textoBusqueda = ''): Promise<Paciente[]> {
    const filtro = normalizarTextoBusqueda(textoBusqueda);
    if (!filtro) {
      return this.db.getAllAsync<Paciente>(
        `SELECT id_paciente, uid_medico, folio_clinico, nombre, sexo, fecha_nacimiento,
                creado_en, actualizado_en, eliminado_en, estado_sync, revision_local,
                revision_remota, confirmado_servidor_en
         FROM PACIENTE
         WHERE uid_medico = ? AND eliminado_en IS NULL
         ORDER BY actualizado_en DESC`,
        uidMedico,
      );
    }

    const patron = `%${filtro}%`;
    return this.db.getAllAsync<Paciente>(
      `SELECT id_paciente, uid_medico, folio_clinico, nombre, sexo, fecha_nacimiento,
              creado_en, actualizado_en, eliminado_en, estado_sync, revision_local,
              revision_remota, confirmado_servidor_en
       FROM PACIENTE
       WHERE uid_medico = ? AND eliminado_en IS NULL
         AND (folio_normalizado LIKE ? OR nombre_normalizado LIKE ?)
       ORDER BY nombre ASC`,
      uidMedico,
      patron,
      patron,
    );
  }

  async obtenerPorId(idPaciente: string): Promise<Paciente | null> {
    return this.db.getFirstAsync<Paciente>(
      `SELECT id_paciente, uid_medico, folio_clinico, nombre, sexo, fecha_nacimiento,
              creado_en, actualizado_en, eliminado_en, estado_sync, revision_local,
              revision_remota, confirmado_servidor_en
       FROM PACIENTE
       WHERE id_paciente = ? AND eliminado_en IS NULL`,
      idPaciente,
    );
  }

  /**
   * Actualiza datos del paciente (CU-10). Si cambia sexo o fecha de nacimiento, valida
   * y recalcula atómicamente todas sus consultas activas dentro de la misma transacción.
   */
  async actualizar(params: {
    id_paciente: string;
    folio_clinico: string;
    nombre: string;
    sexo: Sexo;
    fecha_nacimiento: string;
    fecha_hoy?: string;
  }): Promise<Paciente> {
    const actual = await this.obtenerPorId(params.id_paciente);
    if (!actual) {
      throw new Error('Paciente no encontrado.');
    }

    const errores = validarPacienteDatos({
      folio_clinico: params.folio_clinico,
      nombre: params.nombre,
      fecha_nacimiento: params.fecha_nacimiento,
      fecha_hoy: params.fecha_hoy,
    });
    if (errores.length > 0) {
      throw new Error(errores.map((e) => e.mensaje).join(' '));
    }

    const folioLimpio = params.folio_clinico.trim();
    const folioNorm = normalizarTextoBusqueda(folioLimpio);
    const nombreLimpio = params.nombre.trim();
    const nombreNorm = normalizarTextoBusqueda(nombreLimpio);

    const duplicado = await this.db.getFirstAsync<{ id_paciente: string }>(
      `SELECT id_paciente FROM PACIENTE
       WHERE uid_medico = ? AND folio_normalizado = ? AND id_paciente != ? AND eliminado_en IS NULL`,
      actual.uid_medico,
      folioNorm,
      actual.id_paciente,
    );
    if (duplicado) {
      throw new Error(`El folio "${folioLimpio}" ya pertenece a otro paciente.`);
    }

    const requiereRecalculo =
      actual.sexo !== params.sexo || actual.fecha_nacimiento !== params.fecha_nacimiento;
    const ahora = ahoraUtcIso();
    const nuevaRevision = actual.revision_local + 1;

    await this.db.withExclusiveTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE PACIENTE
         SET folio_clinico = ?, folio_normalizado = ?, nombre = ?, nombre_normalizado = ?,
             sexo = ?, fecha_nacimiento = ?, actualizado_en = ?,
             estado_sync = 'PENDIENTE', revision_local = ?
         WHERE id_paciente = ?`,
        folioLimpio,
        folioNorm,
        nombreLimpio,
        nombreNorm,
        params.sexo,
        params.fecha_nacimiento,
        ahora,
        nuevaRevision,
        actual.id_paciente,
      );

      if (requiereRecalculo) {
        const consultas = await this.db.getAllAsync<ConsultaRow>(
          `SELECT id_consulta, id_paciente, fecha_consulta, peso_kg,
                  longitud_talla_cm, perimetro_cefalico_cm, posicion_medicion, revision_local
           FROM CONSULTA
           WHERE id_paciente = ? AND eliminado_en IS NULL`,
          actual.id_paciente,
        );

        for (const c of consultas) {
          const evalSalida = evaluarConsultaAntropometrica({
            sexo: params.sexo,
            fecha_nacimiento: params.fecha_nacimiento,
            fecha_consulta: c.fecha_consulta,
            fecha_hoy: params.fecha_hoy ?? c.fecha_consulta,
            peso_kg: c.peso_kg,
            longitud_talla_cm: c.longitud_talla_cm,
            perimetro_cefalico_cm: c.perimetro_cefalico_cm,
            posicion_medicion: c.posicion_medicion,
          });

          await this.db.runAsync(
            `UPDATE CONSULTA
             SET id_conjunto = ?, edad_dias = ?, longitud_talla_ajustada_cm = ?, imc = ?,
                 version_motor = ?, calculado_en = ?, actualizado_en = ?,
                 estado_sync = 'PENDIENTE', revision_local = ?
             WHERE id_consulta = ?`,
            evalSalida.id_conjunto,
            evalSalida.edad_dias,
            evalSalida.longitud_talla_ajustada_cm,
            evalSalida.imc,
            evalSalida.version_motor,
            ahora,
            ahora,
            c.revision_local + 1,
            c.id_consulta,
          );

          for (const res of evalSalida.resultados) {
            await this.db.runAsync(
              `UPDATE RESULTADO_INDICADOR
               SET estado = ?, puntaje_z = ?, percentil = ?, clasificacion = ?,
                   es_atipico = ?, motivo_no_aplica = ?
               WHERE id_consulta = ? AND codigo_indicador = ?`,
              res.estado,
              res.puntaje_z,
              res.percentil,
              res.clasificacion,
              res.es_atipico ? 1 : 0,
              res.motivo_no_aplica,
              c.id_consulta,
              res.codigo_indicador,
            );
          }
        }
      }
    });

    return {
      ...actual,
      folio_clinico: folioLimpio,
      nombre: nombreLimpio,
      sexo: params.sexo,
      fecha_nacimiento: params.fecha_nacimiento,
      actualizado_en: ahora,
      estado_sync: 'PENDIENTE',
      revision_local: nuevaRevision,
    };
  }

  /** Baja lógica en cascada del paciente y todas sus consultas para propagar en CU-20 (CU-11). */
  async eliminarLogico(idPaciente: string): Promise<void> {
    const actual = await this.obtenerPorId(idPaciente);
    if (!actual) return;

    const ahora = ahoraUtcIso();
    await this.db.withExclusiveTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE CONSULTA
         SET eliminado_en = ?, actualizado_en = ?, estado_sync = 'PENDIENTE',
             revision_local = revision_local + 1
         WHERE id_paciente = ? AND eliminado_en IS NULL`,
        ahora,
        ahora,
        idPaciente,
      );
      await this.db.runAsync(
        `UPDATE PACIENTE
         SET eliminado_en = ?, actualizado_en = ?, estado_sync = 'PENDIENTE',
             revision_local = revision_local + 1
         WHERE id_paciente = ?`,
        ahora,
        ahora,
        idPaciente,
      );
    });
  }
}
