import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { ConsultaConResultados } from '../data';
import { CodigoIndicador, Paciente } from '../domain';
import {
  construirHtmlReporteClinico,
  construirNombreArchivoPdf,
} from './pdfHtmlTemplate';

export { construirHtmlReporteClinico, construirNombreArchivoPdf };

/**
 * Genera el PDF offline y abre la hoja nativa de guardado/compartición (CU-19).
 * El archivo se renombra exactamente a `[Folio]_[Fecha].pdf` sin incluir el nombre del paciente.
 */
export async function generarYCompartirReportePdf(params: {
  paciente: Paciente;
  detalle: ConsultaConResultados;
  historialConsultas?: ConsultaConResultados[];
  indicadorGrafica?: CodigoIndicador;
}): Promise<string> {
  const html = construirHtmlReporteClinico(params);
  const { uri } = await Print.printToFileAsync({ html });

  const nombreArchivo = construirNombreArchivoPdf(
    params.paciente.folio_clinico,
    params.detalle.consulta.fecha_consulta,
  );
  const archivoOrigen = new File(uri);
  const archivoDestino = new File(Paths.cache, nombreArchivo);

  if (archivoDestino.exists) {
    archivoDestino.delete();
  }
  await archivoOrigen.move(archivoDestino);

  await shareAsync(archivoDestino.uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: nombreArchivo,
  });

  return archivoDestino.uri;
}
