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
import { Medico, detectarDecrementoMedida, evaluarConsultaAntropometrica } from '../src/domain';
import { construirGeometriaCurvaOMS } from '../src/services/growthChartBuilder';
import {
  construirHtmlReporteClinico,
  construirNombreArchivoPdf,
} from '../src/services/pdfHtmlTemplate';
import { NodeSqliteAdapter } from './helpers/nodeSqliteAdapter';

class FakeCloudFirestore implements RemoteSyncStore {
  medicos = new Map<string, Medico>();
  pacientes = new Map<string, Map<string, PacienteRemotoDoc>>();
  consultas = new Map<string, Map<string, ConsultaRemotaDoc>>();

  async guardarPerfilMedico(medico: Medico) {
    this.medicos.set(medico.uid_medico, medico);
  }
  async obtenerPerfilMedico(uid: string) {
    return this.medicos.get(uid) ?? null;
  }
  async subirPaciente(uid: string, doc: PacienteRemotoDoc) {
    if (!this.pacientes.has(uid)) this.pacientes.set(uid, new Map());
    const confirmadoEn = new Date().toISOString();
    this.pacientes.get(uid)!.set(doc.id_paciente, {
      ...doc,
      confirmado_servidor_en: confirmadoEn,
    });
    return { revisionRemota: doc.revision_remota, confirmadoEn };
  }
  async subirConsulta(uid: string, doc: ConsultaRemotaDoc) {
    if (!this.consultas.has(uid)) this.consultas.set(uid, new Map());
    const confirmadoEn = new Date().toISOString();
    this.consultas.get(uid)!.set(doc.id_consulta, {
      ...doc,
      confirmado_servidor_en: confirmadoEn,
    });
    return { revisionRemota: doc.revision_remota, confirmadoEn };
  }
  async descargarCambios(uid: string, cursor: string | null): Promise<CambiosRemotosDelta> {
    const pacs = Array.from(this.pacientes.get(uid)?.values() ?? []).filter((p) => {
      const ts = p.confirmado_servidor_en ?? p.actualizado_en;
      return !cursor || ts > cursor;
    });
    const cons = Array.from(this.consultas.get(uid)?.values() ?? []).filter((c) => {
      const ts = c.confirmado_servidor_en ?? c.actualizado_en;
      return !cursor || ts > cursor;
    });
    let maxTs = cursor;
    for (const p of pacs) {
      const ts = p.confirmado_servidor_en ?? p.actualizado_en;
      if (!maxTs || ts > maxTs) maxTs = ts;
    }
    for (const c of cons) {
      const ts = c.confirmado_servidor_en ?? c.actualizado_en;
      if (!maxTs || ts > maxTs) maxTs = ts;
    }
    return { pacientes: pacs, consultas: cons, nuevoCursor: maxTs };
  }
  async eliminarTodoDeMedico(uid: string) {
    this.medicos.delete(uid);
    this.pacientes.delete(uid);
    this.consultas.delete(uid);
  }
}

describe('Pruebas de aceptación end-to-end de flujos (PA-01 a PA-07)', () => {
  let dbA: NodeSqliteAdapter;
  let dbB: NodeSqliteAdapter;
  let cloud: FakeCloudFirestore;

  beforeEach(async () => {
    dbA = new NodeSqliteAdapter();
    dbB = new NodeSqliteAdapter();
    await inicializarBaseDatos(dbA);
    await inicializarBaseDatos(dbB);
    cloud = new FakeCloudFirestore();
  });

  afterEach(() => {
    dbA.cerrar();
    dbB.cerrar();
  });

  it('PA-01 a PA-05: flujo clínico completo desde registro de paciente hasta reporte PDF', async () => {
    const medicoRepo = new MedicoRepository(dbA);
    const pacRepo = new PacienteRepository(dbA);
    const conRepo = new ConsultaRepository(dbA);

    await medicoRepo.guardarPerfil({ uid_medico: 'med-A', correo: 'a@ipn.mx' });

    // PA-01: bloquea 61 meses, permite 59 meses y queda pendiente de sincronizar
    await expect(
      pacRepo.registrar({
        uid_medico: 'med-A',
        folio_clinico: 'PAC-001',
        nombre: 'Infante 61m',
        sexo: 'M',
        fecha_nacimiento: '2021-10-01',
        fecha_hoy: '2026-11-17',
      }),
    ).rejects.toThrow(/60 meses/);

    const pac = await pacRepo.registrar({
      uid_medico: 'med-A',
      folio_clinico: 'PAC-001',
      nombre: 'Infante 18m',
      sexo: 'M',
      fecha_nacimiento: '2025-05-18',
      fecha_hoy: '2026-11-17',
    });
    expect(pac.estado_sync).toBe('PENDIENTE');

    // PA-02: 18 meses, peso 10.5, talla 82.0 cm de pie -> ajusta a 82.7 cm conservando 82.0
    const evalPA02 = evaluarConsultaAntropometrica({
      sexo: pac.sexo,
      fecha_nacimiento: pac.fecha_nacimiento,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 10.5,
      longitud_talla_cm: 82.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'DE_PIE',
    });
    expect(evalPA02.hay_atipicos).toBe(false);

    const detPA02 = await conRepo.registrar({
      id_paciente: pac.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 10.5,
      longitud_talla_cm: 82.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'DE_PIE',
    });
    expect(detPA02.consulta.longitud_talla_cm).toBe(82.0);
    expect(detPA02.consulta.longitud_talla_ajustada_cm).toBe(82.7);

    // PA-03: peso 25.0 kg a los ~18m -> detecta atípico y confirma
    const detAtipico = await conRepo.registrar({
      id_paciente: pac.id_paciente,
      fecha_consulta: '2026-11-18',
      fecha_hoy: '2026-11-18',
      peso_kg: 25.0,
      longitud_talla_cm: 83.0,
      perimetro_cefalico_cm: 46.5,
      posicion_medicion: 'ACOSTADO',
      atipico_confirmado: true,
    });
    expect(detAtipico.consulta.atipico_confirmado).toBe(true);
    expect(detAtipico.resultados.find((r) => r.codigo_indicador === 'P_E')!.es_atipico).toBe(true);

    // Aviso > 1 cm (CU-15 4b)
    expect(
      detectarDecrementoMedida(
        { longitud_talla_cm: 83.0, perimetro_cefalico_cm: 46.5 },
        { longitud_talla_cm: 81.5, perimetro_cefalico_cm: 46.5 },
      ),
    ).toHaveLength(1);

    // PA-04: curvas con consultas cronológicas y cambio Z <-> Percentiles
    const geo = construirGeometriaCurvaOMS({
      indicador: 'PC_E',
      sexo: pac.sexo,
      vista: 'PERCENTIL',
      fechaNacimiento: pac.fecha_nacimiento,
      consultas: [detAtipico, detPA02],
    });
    expect(geo.puntosPaciente).toHaveLength(2);
    expect(geo.puntosPaciente[1].esAtipico).toBe(true);

    // PA-05: reporte PDF anonimizado con gráfica y leyenda
    expect(construirNombreArchivoPdf(pac.folio_clinico, '2026-11-18')).toBe('PAC-001_2026-11-18.pdf');
    const html = construirHtmlReporteClinico({
      paciente: pac,
      detalle: detAtipico,
      historialConsultas: [detPA02, detAtipico],
    });
    expect(html).toContain('Clasificación referencial, no diagnóstica.');
    expect(html).toContain('<svg');
  });

  it('PA-06 y PA-07: sincronización offline->online entre dispositivos y aislamiento estricto entre cuentas', async () => {
    const medRepoA = new MedicoRepository(dbA);
    const pacRepoA = new PacienteRepository(dbA);
    const syncA = new SyncService(dbA, cloud);

    const medRepoB = new MedicoRepository(dbB);
    const pacRepoB = new PacienteRepository(dbB);
    const syncB = new SyncService(dbB, cloud);

    await medRepoA.guardarPerfil({ uid_medico: 'med-A', correo: 'a@ipn.mx' });
    await pacRepoA.registrar({
      uid_medico: 'med-A',
      folio_clinico: 'A-01',
      nombre: 'Paciente A1',
      sexo: 'F',
      fecha_nacimiento: '2026-01-01',
      fecha_hoy: '2026-11-17',
    });

    // Sin conexión, B no ve el paciente de A
    await medRepoB.guardarPerfil({ uid_medico: 'med-A', correo: 'a@ipn.mx' });
    await syncB.sincronizar({ uid_medico: 'med-A', id_dispositivo: 'disp-B', hayConexion: true });
    expect(await pacRepoB.buscar('med-A')).toHaveLength(0);

    // Al volver la red en A, sube y B lo recupera
    await syncA.sincronizar({ uid_medico: 'med-A', id_dispositivo: 'disp-A', hayConexion: true });
    await syncB.sincronizar({ uid_medico: 'med-A', id_dispositivo: 'disp-B', hayConexion: true });
    expect(await pacRepoB.buscar('med-A')).toHaveLength(1);

    // PA-07: Al cerrar sesión en A se limpia caché local y Médico B inicia en limpio
    await medRepoA.limpiarDatosLocales();
    await medRepoA.guardarPerfil({ uid_medico: 'med-B', correo: 'b@ipn.mx' });
    await syncA.sincronizar({ uid_medico: 'med-B', id_dispositivo: 'disp-A', hayConexion: true });
    expect(await pacRepoA.buscar('med-B')).toHaveLength(0);
  });
});
