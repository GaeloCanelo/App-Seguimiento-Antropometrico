import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { ConsultaConResultados } from '../data';
import { CodigoIndicador, Paciente } from '../domain';
import {
  construirHtmlReporteClinico,
  construirNombreArchivoPdf,
} from './pdfHtmlTemplate';

export { construirHtmlReporteClinico, construirNombreArchivoPdf };

function describirErrorPdf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'error desconocido del dispositivo';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((clean.length * 3) / 4 - padding);
  let outIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2]);
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3]);
    const triple = (a << 18) | (b << 12) | (c << 6) | d;
    out[outIndex++] = (triple >> 16) & 0xff;
    if (clean[i + 2] !== '=') out[outIndex++] = (triple >> 8) & 0xff;
    if (clean[i + 3] !== '=') out[outIndex++] = triple & 0xff;
  }
  return out;
}

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
  const nombreArchivo = construirNombreArchivoPdf(
    params.paciente.folio_clinico,
    params.detalle.consulta.fecha_consulta,
  );

  let uriCompartir = '';
  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return nombreArchivo;
    }

    const generado = await Print.printToFileAsync({ html, base64: true });
    if (!generado?.base64 && !generado?.uri) {
      throw new Error('el sistema no devolvió el archivo PDF generado');
    }

    if (generado.base64) {
      // En Expo SDK 58, ExponentFileSystem legado ya no existe en Expo Go (cacheDirectory = null)
      // y expo-print guarda en /cache/Print/ fuera del scope de Expo Go. Escribimos los bytes
      // directamente con la API moderna File/Paths dentro del sandbox autorizado.
      const bytes = base64ToUint8Array(generado.base64);
      const destino = new File(Paths.cache, nombreArchivo);
      destino.create({ intermediates: true, overwrite: true });
      destino.write(bytes);
      uriCompartir = destino.uri;
    } else {
      const origen = new File(generado.uri);
      const destino = new File(Paths.cache, nombreArchivo);
      await origen.move(destino, { overwrite: true });
      uriCompartir = destino.uri;
    }

    if (!(await isAvailableAsync())) {
      throw new Error('la hoja de compartición no está disponible en este dispositivo');
    }

    await shareAsync(uriCompartir, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: nombreArchivo,
    });

    return uriCompartir;
  } catch (error) {
    const rutaInfo = uriCompartir ? ` [${uriCompartir}]` : '';
    throw new Error(
      `No fue posible generar o compartir el PDF (${describirErrorPdf(error)}${rutaInfo}).`,
    );
  }
}
