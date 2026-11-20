import { ConsultaConResultados } from '../data';
import {
  CATALOGO_INDICADORES,
  CodigoIndicador,
  Paciente,
  clasificarIndicador,
  formatearEdadMesesYDias,
} from '../domain';
import {
  construirGeometriaCurvaOMS,
  renderizarCurvaOmsSvgString,
} from './growthChartBuilder';

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Construye el nombre anonimizado exigido por CU-19 / PA-05: `[Folio]_[Fecha].pdf` */
export function construirNombreArchivoPdf(folioClinico: string, fechaConsulta: string): string {
  const folioSeguro = folioClinico.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${folioSeguro}_${fechaConsulta}.pdf`;
}

/** Genera el documento HTML completo (incluyendo la curva SVG OMS) para el reporte PDF. */
export function construirHtmlReporteClinico(params: {
  paciente: Paciente;
  detalle: ConsultaConResultados;
  historialConsultas?: ConsultaConResultados[];
  indicadorGrafica?: CodigoIndicador;
  graficaSvgHtml?: string;
}): string {
  const { paciente, detalle } = params;
  const { consulta, resultados } = detalle;
  const edadTexto = formatearEdadMesesYDias(paciente.fecha_nacimiento, consulta.fecha_consulta).texto;

  const indicadorGrafica = params.indicadorGrafica ?? 'P_E';
  const consultasParaGrafica = (params.historialConsultas ?? [detalle]).filter(
    (c) => c.consulta.fecha_consulta <= consulta.fecha_consulta,
  );
  const svgGrafica =
    params.graficaSvgHtml ??
    renderizarCurvaOmsSvgString(
      construirGeometriaCurvaOMS({
        indicador: indicadorGrafica,
        sexo: paciente.sexo,
        vista: 'Z',
        fechaNacimiento: paciente.fecha_nacimiento,
        consultas: consultasParaGrafica.length > 0 ? consultasParaGrafica : [detalle],
      }),
    );

  const metaGrafica = CATALOGO_INDICADORES.find((m) => m.codigo_indicador === indicadorGrafica);

  const filas = CATALOGO_INDICADORES.map((meta) => {
    const r = resultados.find((x) => x.codigo_indicador === meta.codigo_indicador);
    if (!r || r.estado === 'NO_APLICA' || r.puntaje_z === null || r.percentil === null) {
      return `
        <tr>
          <td>${escapeHtml(meta.nombre)}</td>
          <td>—</td>
          <td>—</td>
          <td>No aplica (${escapeHtml(r?.motivo_no_aplica ?? 'Fuera de dominio')})</td>
        </tr>`;
    }

    const clasif = clasificarIndicador(meta.codigo_indicador, r.puntaje_z);
    const marcaAtipico = r.es_atipico ? ' <strong>[Atípico]</strong>' : '';
    return `
      <tr>
        <td>${escapeHtml(meta.nombre)}</td>
        <td>${r.puntaje_z.toFixed(2)}</td>
        <td>${r.percentil.toFixed(1)}</td>
        <td style="color:${clasif.colorHex}; font-weight:600;">
          ${escapeHtml(clasif.etiqueta)}${marcaAtipico}
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1B263B; margin: 26px; font-size: 13px; }
    h1 { color: #0F4C81; font-size: 18px; margin-bottom: 4px; }
    h2 { color: #0F4C81; font-size: 14px; margin: 14px 0 6px; }
    .subtitle { color: #5C6B7A; font-size: 12px; margin-bottom: 14px; }
    .disclaimer { background: #E3EEF8; border-left: 4px solid #0F4C81; padding: 8px 12px; font-weight: bold; color: #0F4C81; margin-bottom: 14px; }
    .grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; background: #F5F7FA; padding: 12px; border-radius: 6px; }
    .cell { width: 47%; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; }
    th, td { border: 1px solid #D6DEE8; padding: 7px 8px; text-align: left; }
    th { background: #0F4C81; color: #FFFFFF; }
    .atipico { background: #FFF3E0; border-left: 4px solid #EF6C00; padding: 8px 12px; margin-bottom: 12px; }
    .chart-box { margin-top: 8px; }
    .footer { margin-top: 16px; font-size: 11px; color: #5C6B7A; }
  </style>
</head>
<body>
  <h1>Reporte de Seguimiento Antropométrico Pediátrico (OMS 2006)</h1>
  <div class="subtitle">Folio clínico: <strong>${escapeHtml(paciente.folio_clinico)}</strong> · Fecha de consulta: <strong>${escapeHtml(consulta.fecha_consulta)}</strong></div>

  <div class="disclaimer">Clasificación referencial, no diagnóstica.</div>

  ${
    consulta.atipico_confirmado
      ? '<div class="atipico"><strong>Nota de plausibilidad:</strong> Consulta registrada con valor(es) atípico(s) confirmado(s) por el médico.</div>'
      : ''
  }

  <div class="grid">
    <div class="cell"><strong>Nombre:</strong> ${escapeHtml(paciente.nombre)}</div>
    <div class="cell"><strong>Sexo:</strong> ${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
    <div class="cell"><strong>Edad en consulta:</strong> ${escapeHtml(edadTexto)} (${consulta.edad_dias} días)</div>
    <div class="cell"><strong>Posición de medición:</strong> ${consulta.posicion_medicion === 'ACOSTADO' ? 'Acostado' : 'De pie'}</div>
    <div class="cell"><strong>Peso:</strong> ${consulta.peso_kg.toFixed(2)} kg</div>
    <div class="cell"><strong>Longitud/Talla capturada:</strong> ${consulta.longitud_talla_cm.toFixed(1)} cm (Ajustada: ${consulta.longitud_talla_ajustada_cm.toFixed(1)} cm)</div>
    <div class="cell"><strong>Perímetro cefálico:</strong> ${consulta.perimetro_cefalico_cm.toFixed(1)} cm</div>
    <div class="cell"><strong>IMC:</strong> ${consulta.imc.toFixed(2)} kg/m²</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Indicador OMS</th>
        <th>Puntaje Z</th>
        <th>Percentil</th>
        <th>Clasificación referencial</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <h2>Curva de Crecimiento OMS — ${escapeHtml(metaGrafica?.nombre ?? indicadorGrafica)} (Puntaje Z)</h2>
  <div class="chart-box">${svgGrafica}</div>

  <div class="footer">
    Referencias: Patrones de Crecimiento Infantil de la OMS (2006) · Motor ${escapeHtml(consulta.version_motor)} · Conjunto ${escapeHtml(consulta.id_conjunto)}
  </div>
</body>
</html>`;
}
