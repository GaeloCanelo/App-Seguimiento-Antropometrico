import { inicializarBaseDatos } from '../src/data/database/schema';
import { ConsultaRepository } from '../src/data/repositories/consultaRepository';
import { MedicoRepository } from '../src/data/repositories/medicoRepository';
import { PacienteRepository } from '../src/data/repositories/pacienteRepository';
import {
  construirGeometriaCurvaOMS,
  renderizarCurvaOmsSvgString,
} from '../src/services/growthChartBuilder';
import {
  construirHtmlReporteClinico,
  construirNombreArchivoPdf,
} from '../src/services/pdfHtmlTemplate';
import { NodeSqliteAdapter } from './helpers/nodeSqliteAdapter';

describe('Curvas de crecimiento SVG OMS y plantilla de reporte PDF (CU-18, CU-19, PA-04, PA-05)', () => {
  let db: NodeSqliteAdapter;

  beforeEach(async () => {
    db = new NodeSqliteAdapter();
    await inicializarBaseDatos(db);
  });

  afterEach(() => {
    db.cerrar();
  });

  it('PA-04 y CU-18: grafica puntos cronológicos, omite línea con 1 sola consulta y alterna entre Z y Percentiles', async () => {
    const medicoRepo = new MedicoRepository(db);
    const pacRepo = new PacienteRepository(db);
    const conRepo = new ConsultaRepository(db);

    await medicoRepo.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc@ipn.mx' });
    const paciente = await pacRepo.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'PAC-001',
      nombre: 'Sofía Hernández',
      sexo: 'F',
      fecha_nacimiento: '2025-05-17',
      fecha_hoy: '2026-11-17',
    });

    const d1 = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2025-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 7.2,
      longitud_talla_cm: 65.0,
      perimetro_cefalico_cm: 42.5,
      posicion_medicion: 'ACOSTADO',
    });

    // Con 1 sola consulta: 1 punto y sin trayectoria (CU-18 2a)
    const geo1 = construirGeometriaCurvaOMS({
      indicador: 'PC_E',
      sexo: paciente.sexo,
      vista: 'Z',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: [d1],
    });
    expect(geo1.puntosPaciente).toHaveLength(1);
    expect(geo1.trayectoriaStr).toBeNull();
    expect(geo1.curvasReferencia.map((c) => c.etiqueta)).toEqual([
      '-3',
      '-2',
      '-1',
      '0',
      '+1',
      '+2',
      '+3',
    ]);

    // Con 4 consultas: 4 puntos conectados cronológicamente y vista en Percentiles P3..P97
    const d2 = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2026-02-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 8.4,
      longitud_talla_cm: 70.0,
      perimetro_cefalico_cm: 44.0,
      posicion_medicion: 'ACOSTADO',
    });
    const d3 = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2026-06-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 9.5,
      longitud_talla_cm: 75.0,
      perimetro_cefalico_cm: 45.2,
      posicion_medicion: 'ACOSTADO',
    });
    const d4 = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 10.6,
      longitud_talla_cm: 80.5,
      perimetro_cefalico_cm: 46.5,
      posicion_medicion: 'ACOSTADO',
    });

    // Pasamos desordenado para comprobar orden cronológico
    const geo4Percentiles = construirGeometriaCurvaOMS({
      indicador: 'PC_E',
      sexo: paciente.sexo,
      vista: 'PERCENTIL',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: [d4, d1, d3, d2],
    });
    expect(geo4Percentiles.puntosPaciente).toHaveLength(4);
    expect(geo4Percentiles.puntosPaciente.map((p) => p.fecha_consulta)).toEqual([
      '2025-11-17',
      '2026-02-17',
      '2026-06-17',
      '2026-11-17',
    ]);
    expect(geo4Percentiles.trayectoriaStr).toBeTruthy();
    expect(geo4Percentiles.curvasReferencia.map((c) => c.etiqueta)).toEqual([
      'P3',
      'P15',
      'P50',
      'P85',
      'P97',
    ]);
  });

  it('CU-18 (2b): omite puntos donde el indicador no aplica e indica el motivo', async () => {
    const medicoRepo = new MedicoRepository(db);
    const pacRepo = new PacienteRepository(db);
    const conRepo = new ConsultaRepository(db);

    await medicoRepo.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc@ipn.mx' });
    const paciente = await pacRepo.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'PAC-002',
      nombre: 'Lucas Méndez',
      sexo: 'M',
      fecha_nacimiento: '2024-01-01',
      fecha_hoy: '2026-11-17',
    });

    // Talla de 40 cm (fuera de tabla TALLA 65..120 cm) -> P_T es NO_APLICA
    const dOut = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 12.0,
      longitud_talla_cm: 40.0,
      perimetro_cefalico_cm: 48.0,
      posicion_medicion: 'DE_PIE',
      atipico_confirmado: true,
    });

    const geoPT = construirGeometriaCurvaOMS({
      indicador: 'P_T',
      sexo: paciente.sexo,
      vista: 'Z',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: [dOut],
    });
    expect(geoPT.puntosPaciente).toHaveLength(0);
    expect(geoPT.puntosOmitidos).toHaveLength(1);
    expect(geoPT.puntosOmitidos[0].motivo).toMatch(/fuera del dominio/i);
  });

  it('PA-05 y CU-19: nombra el PDF como [Folio]_[Fecha].pdf sin nombre y embebe SVG + leyenda + atípicos', async () => {
    expect(construirNombreArchivoPdf('PAC-001', '2026-11-03')).toBe('PAC-001_2026-11-03.pdf');
    expect(construirNombreArchivoPdf('PAC 001/A', '2026-11-03')).toBe('PAC_001_A_2026-11-03.pdf');

    const medicoRepo = new MedicoRepository(db);
    const pacRepo = new PacienteRepository(db);
    const conRepo = new ConsultaRepository(db);

    await medicoRepo.guardarPerfil({ uid_medico: 'doc-1', correo: 'doc@ipn.mx' });
    const paciente = await pacRepo.registrar({
      uid_medico: 'doc-1',
      folio_clinico: 'PAC-001',
      nombre: 'Confidencial Infante',
      sexo: 'M',
      fecha_nacimiento: '2025-11-17',
      fecha_hoy: '2026-11-17',
    });

    const detalle = await conRepo.registrar({
      id_paciente: paciente.id_paciente,
      fecha_consulta: '2026-11-17',
      fecha_hoy: '2026-11-17',
      peso_kg: 25.0,
      longitud_talla_cm: 76.0,
      perimetro_cefalico_cm: 46.0,
      posicion_medicion: 'ACOSTADO',
      atipico_confirmado: true,
    });

    const geo = construirGeometriaCurvaOMS({
      indicador: 'P_E',
      sexo: paciente.sexo,
      vista: 'Z',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: [detalle],
    });
    const svgStr = renderizarCurvaOmsSvgString(geo);
    expect(svgStr).toContain('<svg');
    expect(svgStr).toContain('stroke="#C62828"');

    const html = construirHtmlReporteClinico({ paciente, detalle });
    expect(html).toContain('PAC-001');
    expect(html).toContain('2026-11-17');
    expect(html).toContain('Clasificación referencial, no diagnóstica.');
    expect(html).toContain('atípico(s) confirmado(s)');
    expect(html).toContain('<svg');
    expect(html).toContain('background:#F2E9FF');
    const talla = construirHtmlReporteClinico({ paciente, detalle, indicadorGrafica: 'T_E' });
    expect(talla).toContain('background:#E4F7F3');
    expect(talla).toContain('stroke="#16736A"');
  });
});
