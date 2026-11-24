import { inicializarBaseDatos } from '../src/data/database/schema';
import { ConsultaRepository } from '../src/data/repositories/consultaRepository';
import { MedicoRepository } from '../src/data/repositories/medicoRepository';
import { PacienteRepository } from '../src/data/repositories/pacienteRepository';
import { construirGeometriaCurvaOMS } from '../src/services/growthChartBuilder';
import {
  construirHtmlReporteClinico,
  construirNombreArchivoPdf,
} from '../src/services/pdfHtmlTemplate';
import { dateFromField, measurementFromField } from '../src/views/utils/clinicalDisplay';
import { NodeSqliteAdapter } from './helpers/nodeSqliteAdapter';

it('lleva la captura localizada hasta SQLite, la corrección OMS, las curvas y el reporte offline', async () => {
  const db = new NodeSqliteAdapter();
  try {
    await inicializarBaseDatos(db);
    const doctors = new MedicoRepository(db);
    const patients = new PacienteRepository(db);
    const consultations = new ConsultaRepository(db);
    await doctors.guardarPerfil({ uid_medico: 'kidolog-test', correo: 'prueba@example.test' });
    const fecha_hoy = '2026-11-22';
    const patient = await patients.registrar({
      uid_medico: 'kidolog-test',
      nombre: 'Paciente de prueba',
      sexo: 'M',
      folio_clinico: 'KID-PRUEBA',
      fecha_nacimiento: dateFromField('18/05/2025'),
      fecha_hoy,
    });
    expect(await patients.buscar('kidolog-test', 'kid-prueba')).toHaveLength(1);
    expect(await patients.buscar('otra-cuenta', 'kid-prueba')).toEqual([]);
    const first = await consultations.registrar({
      id_paciente: patient.id_paciente,
      fecha_consulta: dateFromField('18/11/2026'),
      fecha_hoy,
      peso_kg: measurementFromField('10,50'),
      longitud_talla_cm: measurementFromField('82,0'),
      perimetro_cefalico_cm: measurementFromField('46,0'),
      posicion_medicion: 'ACOSTADO',
    });
    expect(first.resultados.filter((row) => row.estado === 'CALCULADO')).toHaveLength(5);
    const corrected = await consultations.corregir({
      id_consulta: first.consulta.id_consulta,
      fecha_consulta: first.consulta.fecha_consulta,
      fecha_hoy,
      peso_kg: measurementFromField('10,80'),
      longitud_talla_cm: 82,
      perimetro_cefalico_cm: 46,
      posicion_medicion: 'ACOSTADO',
    });
    expect(corrected.resultados.find((row) => row.codigo_indicador === 'P_E')?.puntaje_z).not.toBe(
      first.resultados.find((row) => row.codigo_indicador === 'P_E')?.puntaje_z,
    );
    expect(await consultations.existeConsultaEnFecha(patient.id_paciente, '2026-11-18')).toBe(true);
    expect(await consultations.listarPorPaciente(patient.id_paciente)).toHaveLength(1);

    const chart = construirGeometriaCurvaOMS({
      indicador: 'P_E',
      vista: 'PERCENTIL',
      sexo: patient.sexo,
      fechaNacimiento: patient.fecha_nacimiento,
      consultas: [corrected],
    });
    expect(chart.puntosPaciente).toHaveLength(1);
    expect(chart.puntosPaciente[0].valorObservado).toBe(10.8);

    const html = construirHtmlReporteClinico({
      paciente: patient,
      detalle: corrected,
      historialConsultas: [corrected],
    });
    expect(html).toContain('<svg');
    expect(html).toContain('10.80');
    expect(construirNombreArchivoPdf(patient.folio_clinico, first.consulta.fecha_consulta)).toBe(
      'KID-PRUEBA_2026-11-18.pdf',
    );
  } finally {
    db.cerrar();
  }
});
