import { inicializarBaseDatos } from '../src/data/database/schema';
import { ConsultaRepository } from '../src/data/repositories/consultaRepository';
import { MedicoRepository } from '../src/data/repositories/medicoRepository';
import { PacienteRepository } from '../src/data/repositories/pacienteRepository';
import { SyncService } from '../src/data/sync/syncService';
import {
  CambiosRemotosDelta,
  ConsultaRemotaDoc,
  PacienteRemotoDoc,
  RemoteSyncStore,
} from '../src/data/sync/syncTypes';
import { Medico } from '../src/domain';
import { NodeSqliteAdapter } from './helpers/nodeSqliteAdapter';

class InMemoryRemoteStore implements RemoteSyncStore {
  medicos = new Map<string, Medico>();
  pacientes = new Map<string, Map<string, PacienteRemotoDoc>>();
  consultas = new Map<string, Map<string, ConsultaRemotaDoc>>();

  async guardarPerfilMedico(medico: Medico): Promise<void> {
    this.medicos.set(medico.uid_medico, medico);
  }

  async obtenerPerfilMedico(uidMedico: string): Promise<Medico | null> {
    return this.medicos.get(uidMedico) ?? null;
  }

  async subirPaciente(uidMedico: string, doc: PacienteRemotoDoc) {
    if (!this.pacientes.has(uidMedico)) this.pacientes.set(uidMedico, new Map());
    this.pacientes.get(uidMedico)!.set(doc.id_paciente, doc);
    return { revisionRemota: doc.revision_remota, confirmadoEn: new Date().toISOString() };
  }

  async subirConsulta(uidMedico: string, doc: ConsultaRemotaDoc) {
    if (!this.consultas.has(uidMedico)) this.consultas.set(uidMedico, new Map());
    this.consultas.get(uidMedico)!.set(doc.id_consulta, doc);
    return { revisionRemota: doc.revision_remota, confirmadoEn: new Date().toISOString() };
  }

  async descargarCambios(
    uidMedico: string,
    cursorRemoto: string | null,
  ): Promise<CambiosRemotosDelta> {
    const pacs = Array.from(this.pacientes.get(uidMedico)?.values() ?? []).filter(
      (p) => !cursorRemoto || p.actualizado_en > cursorRemoto,
    );
    const cons = Array.from(this.consultas.get(uidMedico)?.values() ?? []).filter(
      (c) => !cursorRemoto || c.actualizado_en > cursorRemoto,
    );

    let maxTs = cursorRemoto;
    for (const p of pacs) if (!maxTs || p.actualizado_en > maxTs) maxTs = p.actualizado_en;
    for (const c of cons) if (!maxTs || c.actualizado_en > maxTs) maxTs = c.actualizado_en;

    return { pacientes: pacs, consultas: cons, nuevoCursor: maxTs };
  }

  async eliminarTodoDeMedico(uidMedico: string): Promise<void> {
    this.medicos.delete(uidMedico);
    this.pacientes.delete(uidMedico);
    this.consultas.delete(uidMedico);
  }
}

describe('Capa de datos SQLite + Repositorios + SyncService (CU-07 a CU-14, CU-20, PA-06, PA-07)', () => {
  let dbA: NodeSqliteAdapter;
  let dbB: NodeSqliteAdapter;
  let remote: InMemoryRemoteStore;

  beforeEach(async () => {
    dbA = new NodeSqliteAdapter();
    dbB = new NodeSqliteAdapter();
    await inicializarBaseDatos(dbA);
    await inicializarBaseDatos(dbB);
    remote = new InMemoryRemoteStore();
  });

  afterEach(() => {
    dbA.cerrar();
    dbB.cerrar();
  });

  it('siembra catálogos INDICADOR (5) y CONJUNTO_OMS al inicializar SQLite', async () => {
    const indicadores = await dbA.getAllAsync<{ codigo_indicador: string }>(
      'SELECT codigo_indicador FROM INDICADOR',
    );
    expect(indicadores).toHaveLength(5);

    const conjuntos = await dbA.getAllAsync<{ id_conjunto: string }>(
      'SELECT id_conjunto FROM CONJUNTO_OMS',
    );
    expect(conjuntos).toHaveLength(1);
    expect(conjuntos[0].id_conjunto).toBe('OMS_2006_V1');
  });

  it('CU-07 a CU-11: registra, busca sin acentos/mayúsculas, evita folios duplicados y recalcula consultas al editar paciente', async () => {
    const medicoRepo = new MedicoRepository(dbA);
    await medicoRepo.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc1@ipn.mx' });

    const pacRepo = new PacienteRepository(dbA);
    const conRepo = new ConsultaRepository(dbA);

    const pac = await pacRepo.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'PAC-001',
      nombre: 'José María López',
      sexo: 'M',
      fecha_nacimiento: '2025-05-17',
      fecha_hoy: '2026-11-17',
    });

    // Folio duplicado bloqueado
    await expect(
      pacRepo.registrar({
        uid_medico: 'doc-1',
        folio_clinico: 'pac-001',
        nombre: 'Otro Niño',
        sexo: 'M',
        fecha_nacimiento: '2025-06-01',
        fecha_hoy: '2026-11-17',
      }),
    ).rejects.toThrow(/folio/i);

    // Búsqueda parcial insensible a acentos y mayúsculas
    const encontrados = await pacRepo.buscar('doc-1', 'jose maria');
    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].id_paciente).toBe(pac.id_paciente);

    // Registrar consulta (transacción atómica con 5 RESULTADO_INDICADOR)
    const detalleInicial = await conRepo.registrar({
      id_paciente: pac.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 10.5,
      longitud_talla_cm: 82.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'DE_PIE',
    });
    expect(detalleInicial.resultados).toHaveLength(5);
    const zInicial = detalleInicial.resultados.find((r) => r.codigo_indicador === 'P_E')!.puntaje_z!;

    // Editar sexo del paciente -> recalcula todas sus consultas atómicamente (CU-10)
    await pacRepo.actualizar({
      id_paciente: pac.id_paciente,
      folio_clinico: 'PAC-001',
      nombre: 'María José López',
      sexo: 'F',
      fecha_nacimiento: '2025-05-17',
      fecha_hoy: '2026-11-17',
    });
    const detalleRecalculado = await conRepo.obtenerDetallePorId(detalleInicial.consulta.id_consulta);
    const zRecalculado = detalleRecalculado!.resultados.find(
      (r) => r.codigo_indicador === 'P_E',
    )!.puntaje_z!;
    expect(zRecalculado).not.toBeCloseTo(zInicial, 3);

    // Baja lógica en cascada oculta paciente y consultas, y permite reutilizar el folio
    await pacRepo.eliminarLogico(pac.id_paciente);
    expect(await pacRepo.buscar('doc-1', '')).toHaveLength(0);
    expect(await conRepo.listarPorPaciente(pac.id_paciente)).toHaveLength(0);

    const pacNuevo = await pacRepo.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'PAC-001',
      nombre: 'Nuevo Paciente Mismo Folio',
      sexo: 'F',
      fecha_nacimiento: '2026-01-01',
      fecha_hoy: '2026-11-17',
    });
    expect(pacNuevo.id_paciente).not.toBe(pac.id_paciente);
  });

  it('PA-06 y PA-07: opera offline, sincroniza entre 2 dispositivos sin duplicados y aísla cuentas', async () => {
    const medicoA = new MedicoRepository(dbA);
    const pacA = new PacienteRepository(dbA);
    const conA = new ConsultaRepository(dbA);
    const syncA = new SyncService(dbA, remote);

    await medicoA.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc1@ipn.mx' });

    // Registro completamente sin conexión en Dispositivo A
    const p1 = await pacA.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'GAM-100',
      nombre: 'Mateo Ruiz',
      sexo: 'M',
      fecha_nacimiento: '2025-05-17',
      fecha_hoy: '2026-11-17',
    });
    await conA.registrar({
      id_paciente: p1.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 10.5,
      longitud_talla_cm: 82.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'ACOSTADO',
    });

    expect(await medicoA.contarCambiosPendientes('doc-1')).toBe(2);

    const resOffline = await syncA.sincronizar({
      uid_medico: 'doc-1',
      id_dispositivo: 'dev-A',
      hayConexion: false,
    });
    expect(resOffline.estado).toBe('SIN_CONEXION');

    // Al volver la conexión en Dispositivo A
    const resOnlineA = await syncA.sincronizar({
      uid_medico: 'doc-1',
      id_dispositivo: 'dev-A',
      hayConexion: true,
    });
    expect(resOnlineA.estado).toBe('SINCRONIZADO');
    expect(resOnlineA.enviadosPacientes).toBe(1);
    expect(resOnlineA.enviadosConsultas).toBe(1);
    expect(await medicoA.contarCambiosPendientes('doc-1')).toBe(0);

    // Dispositivo B inicia sesión con la misma cuenta y descarga los datos (HU-22)
    const medicoB = new MedicoRepository(dbB);
    const pacB = new PacienteRepository(dbB);
    const conB = new ConsultaRepository(dbB);
    const syncB = new SyncService(dbB, remote);

    await medicoB.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc1@ipn.mx' });
    const resOnlineB = await syncB.sincronizar({
      uid_medico: 'doc-1',
      id_dispositivo: 'dev-B',
      hayConexion: true,
    });
    expect(resOnlineB.descargadosPacientes).toBe(1);
    expect(resOnlineB.descargadosConsultas).toBe(1);

    const listaB = await pacB.buscar('doc-1');
    expect(listaB).toHaveLength(1);
    expect(listaB[0].folio_clinico).toBe('GAM-100');
    expect(await conB.listarPorPaciente(p1.id_paciente)).toHaveLength(1);

    // Baja lógica en A se propaga a B y no resucita el registro
    await pacA.eliminarLogico(p1.id_paciente);
    await syncA.sincronizar({ uid_medico: 'doc-1', id_dispositivo: 'dev-A', hayConexion: true });
    await syncB.sincronizar({ uid_medico: 'doc-1', id_dispositivo: 'dev-B', hayConexion: true });
    expect(await pacB.buscar('doc-1')).toHaveLength(0);

    // PA-07: Al cerrar sesión se limpia caché local y el Médico 2 ve su lista vacía
    await medicoA.limpiarDatosLocales();
    await medicoA.guardarPerfil({ uid_medico: 'doc-2', correo: 'doc2@ipn.mx' });
    expect(await pacA.buscar('doc-2')).toHaveLength(0);
  });
});
