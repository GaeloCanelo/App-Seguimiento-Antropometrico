import { indicatorPalette } from '../views/theme/indicatorPalette';
import {
  CATALOGO_INDICADORES,
  CodigoIndicador,
  Consulta,
  DIAS_CORTE_24_MESES,
  ResultadoIndicador,
  Sexo,
  clasificarIndicador,
  formatearEdadMesesYDias,
  generarSerieCurvaReferencia,
} from '../domain';

export type VistaCurva = 'Z' | 'PERCENTIL';

export interface ConsultaParaCurva {
  consulta: Consulta;
  resultados: ResultadoIndicador[];
}

export interface CurvaReferenciaSvg {
  id: string;
  etiqueta: string;
  color: string;
  punteada: boolean;
  puntosStr: string;
  etiquetaY: number;
}

export interface PuntoPacienteSvg {
  id_consulta: string;
  fecha_consulta: string;
  edadTexto: string;
  ejeXValor: number;
  valorObservado: number;
  puntajeZ: number;
  percentil: number;
  clasificacionEtiqueta: string;
  clasificacionColor: string;
  esAtipico: boolean;
  svgX: number;
  svgY: number;
}

export interface PuntoOmitidoCurva {
  id_consulta: string;
  fecha_consulta: string;
  motivo: string;
}

export interface MarcaEjeSvg {
  valor: number;
  etiqueta: string;
  pos: number;
}

export interface GeometriaCurvaOMS {
  ancho: number;
  alto: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  indicador: CodigoIndicador;
  indicadorNombre: string;
  unidadY: string;
  tituloEjeX: string;
  vista: VistaCurva;
  sexo: Sexo;
  tipoTablaPT: 'LONGITUD' | 'TALLA';
  curvasReferencia: CurvaReferenciaSvg[];
  puntosPaciente: PuntoPacienteSvg[];
  puntosOmitidos: PuntoOmitidoCurva[];
  trayectoriaStr: string | null;
  marcasX: MarcaEjeSvg[];
  marcasY: MarcaEjeSvg[];
}

interface NivelCurva {
  z: number;
  etiqueta: string;
  color: string;
  punteada: boolean;
}

const NIVELES_Z: readonly NivelCurva[] = [
  { z: -3, etiqueta: '-3', color: '#C62828', punteada: false },
  { z: -2, etiqueta: '-2', color: '#EF6C00', punteada: false },
  { z: -1, etiqueta: '-1', color: '#F9A825', punteada: true },
  { z: 0, etiqueta: '0', color: '#2E7D32', punteada: false },
  { z: 1, etiqueta: '+1', color: '#F9A825', punteada: true },
  { z: 2, etiqueta: '+2', color: '#EF6C00', punteada: false },
  { z: 3, etiqueta: '+3', color: '#C62828', punteada: false },
];

const NIVELES_PERCENTIL: readonly NivelCurva[] = [
  { z: -1.88079, etiqueta: 'P3', color: '#C62828', punteada: false },
  { z: -1.03643, etiqueta: 'P15', color: '#EF6C00', punteada: true },
  { z: 0, etiqueta: 'P50', color: '#2E7D32', punteada: false },
  { z: 1.03643, etiqueta: 'P85', color: '#EF6C00', punteada: true },
  { z: 1.88079, etiqueta: 'P97', color: '#C62828', punteada: false },
];

function obtenerValorObservado(consulta: Consulta, indicador: CodigoIndicador): number {
  switch (indicador) {
    case 'P_E':
    case 'P_T':
      return consulta.peso_kg;
    case 'T_E':
      return consulta.longitud_talla_ajustada_cm;
    case 'PC_E':
      return consulta.perimetro_cefalico_cm;
    case 'IMC_E':
      return consulta.imc;
  }
}

export function inferirTablaPTInicial(consultas: ConsultaParaCurva[]): 'LONGITUD' | 'TALLA' {
  if (consultas.length === 0) return 'LONGITUD';
  const ordenadas = [...consultas].sort((a, b) =>
    a.consulta.fecha_consulta.localeCompare(b.consulta.fecha_consulta),
  );
  const ultima = ordenadas[ordenadas.length - 1].consulta;
  return ultima.edad_dias < DIAS_CORTE_24_MESES ? 'LONGITUD' : 'TALLA';
}

/**
 * Construye toda la geometría proyectada en coordenadas SVG para graficar curvas OMS
 * tanto en `react-native-svg` (CU-18) como en el HTML del reporte PDF (CU-19).
 */
export function construirGeometriaCurvaOMS(params: {
  indicador: CodigoIndicador;
  sexo: Sexo;
  vista: VistaCurva;
  fechaNacimiento: string;
  consultas: ConsultaParaCurva[];
  tipoTablaPT?: 'LONGITUD' | 'TALLA';
  ancho?: number;
  alto?: number;
}): GeometriaCurvaOMS {
  const ancho = params.ancho ?? 640;
  const alto = params.alto ?? 360;
  const padLeft = 48;
  const padRight = 38;
  const padTop = 20;
  const padBottom = 38;

  const tipoTablaPT = params.tipoTablaPT ?? inferirTablaPTInicial(params.consultas);
  const niveles = params.vista === 'Z' ? NIVELES_Z : NIVELES_PERCENTIL;
  const zValores = niveles.map((n) => n.z);

  const serieRef = generarSerieCurvaReferencia({
    indicador: params.indicador,
    sexo: params.sexo,
    tipoTablaPT,
    zNiveles: zValores,
    pasoEje: params.indicador === 'P_T' ? 1 : 30,
  });

  const ejeMin = serieRef.eje[0];
  const ejeMax = serieRef.eje[serieRef.eje.length - 1];

  // Ordenar cronológicamente de más antigua a más reciente (CU-18)
  const ordenadas = [...params.consultas].sort((a, b) =>
    a.consulta.fecha_consulta.localeCompare(b.consulta.fecha_consulta),
  );

  const puntosPreliminares: Array<{
    consulta: Consulta;
    resultado: ResultadoIndicador;
    ejeXValor: number;
    valorObservado: number;
  }> = [];
  const puntosOmitidos: PuntoOmitidoCurva[] = [];

  for (const item of ordenadas) {
    const res = item.resultados.find((r) => r.codigo_indicador === params.indicador);
    if (!res || res.estado === 'NO_APLICA' || res.puntaje_z === null || res.percentil === null) {
      puntosOmitidos.push({
        id_consulta: item.consulta.id_consulta,
        fecha_consulta: item.consulta.fecha_consulta,
        motivo: res?.motivo_no_aplica ?? 'Indicador no aplicable en esta consulta.',
      });
      continue;
    }

    if (params.indicador === 'P_T') {
      const tablaConsulta = item.consulta.edad_dias < DIAS_CORTE_24_MESES ? 'LONGITUD' : 'TALLA';
      if (tablaConsulta !== tipoTablaPT) {
        puntosOmitidos.push({
          id_consulta: item.consulta.id_consulta,
          fecha_consulta: item.consulta.fecha_consulta,
          motivo: `Pertenece a la tabla de ${tablaConsulta.toLowerCase()} (cambia el selector para verla).`,
        });
        continue;
      }
    }

    const ejeXValor =
      params.indicador === 'P_T'
        ? item.consulta.longitud_talla_ajustada_cm
        : item.consulta.edad_dias;

    puntosPreliminares.push({
      consulta: item.consulta,
      resultado: res,
      ejeXValor,
      valorObservado: obtenerValorObservado(item.consulta, params.indicador),
    });
  }

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const z of zValores) {
    for (const y of serieRef.curvas[z]) {
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  for (const p of puntosPreliminares) {
    if (p.valorObservado < yMin) yMin = p.valorObservado;
    if (p.valorObservado > yMax) yMax = p.valorObservado;
  }

  const margenY = Math.max(0.5, (yMax - yMin) * 0.06);
  const yDomMin = Math.max(0, yMin - margenY);
  const yDomMax = yMax + margenY;

  const plotW = ancho - padLeft - padRight;
  const plotH = alto - padTop - padBottom;

  const mapX = (val: number) =>
    padLeft + ((val - ejeMin) / Math.max(1e-9, ejeMax - ejeMin)) * plotW;
  const mapY = (val: number) =>
    padTop + plotH - ((val - yDomMin) / Math.max(1e-9, yDomMax - yDomMin)) * plotH;

  const curvasReferencia: CurvaReferenciaSvg[] = niveles.map((niv) => {
    const valores = serieRef.curvas[niv.z];
    const pts = serieRef.eje
      .map((xVal, i) => `${mapX(xVal).toFixed(1)},${mapY(valores[i]).toFixed(1)}`)
      .join(' ');
    return {
      id: niv.etiqueta,
      etiqueta: niv.etiqueta,
      color: niv.color,
      punteada: niv.punteada,
      puntosStr: pts,
      etiquetaY: mapY(valores[valores.length - 1]),
    };
  });

  const puntosPaciente: PuntoPacienteSvg[] = puntosPreliminares.map((p) => {
    const z = p.resultado.puntaje_z as number;
    const clasif = clasificarIndicador(params.indicador, z);
    const edadTexto = formatearEdadMesesYDias(
      params.fechaNacimiento,
      p.consulta.fecha_consulta,
    ).texto;

    return {
      id_consulta: p.consulta.id_consulta,
      fecha_consulta: p.consulta.fecha_consulta,
      edadTexto,
      ejeXValor: p.ejeXValor,
      valorObservado: p.valorObservado,
      puntajeZ: z,
      percentil: p.resultado.percentil as number,
      clasificacionEtiqueta: clasif.etiqueta,
      clasificacionColor: clasif.colorHex,
      esAtipico: p.resultado.es_atipico || p.consulta.atipico_confirmado,
      svgX: mapX(p.ejeXValor),
      svgY: mapY(p.valorObservado),
    };
  });

  // CU-18 (2a): Si solo hay 1 consulta, se muestra un único punto sin línea
  const trayectoriaStr =
    puntosPaciente.length >= 2
      ? puntosPaciente.map((p) => `${p.svgX.toFixed(1)},${p.svgY.toFixed(1)}`).join(' ')
      : null;

  const marcasX: MarcaEjeSvg[] =
    params.indicador === 'P_T'
      ? [50, 60, 70, 80, 90, 100, 110, 120]
          .filter((cm) => cm >= ejeMin && cm <= ejeMax)
          .map((cm) => ({ valor: cm, etiqueta: `${cm}`, pos: mapX(cm) }))
      : [0, 12, 24, 36, 48, 60].map((meses) => {
          const dias = Math.min(ejeMax, Math.round(meses * 30.4375));
          return { valor: dias, etiqueta: `${meses}m`, pos: mapX(dias) };
        });

  const marcasY: MarcaEjeSvg[] = [];
  const numTicksY = 5;
  for (let i = 0; i <= numTicksY; i++) {
    const val = yDomMin + ((yDomMax - yDomMin) * i) / numTicksY;
    marcasY.push({
      valor: val,
      etiqueta: val >= 20 ? val.toFixed(0) : val.toFixed(1),
      pos: mapY(val),
    });
  }

  const meta = CATALOGO_INDICADORES.find((m) => m.codigo_indicador === params.indicador)!;

  return {
    ancho,
    alto,
    padLeft,
    padRight,
    padTop,
    padBottom,
    indicador: params.indicador,
    indicadorNombre: meta.nombre,
    unidadY: meta.unidad_medida,
    tituloEjeX:
      params.indicador === 'P_T'
        ? `${tipoTablaPT === 'LONGITUD' ? 'Longitud' : 'Talla'} (cm)`
        : 'Edad (meses)',
    vista: params.vista,
    sexo: params.sexo,
    tipoTablaPT,
    curvasReferencia,
    puntosPaciente,
    puntosOmitidos,
    trayectoriaStr,
    marcasX,
    marcasY,
  };
}

/**
 * Serializa una geometría `GeometriaCurvaOMS` a SVG vectorial puro para embeber en reportes PDF (CU-19).
 */
export function renderizarCurvaOmsSvgString(geo: GeometriaCurvaOMS): string {
  const tone = indicatorPalette[geo.indicador].light;
  const first = geo.curvasReferencia[0];
  const last = geo.curvasReferencia.at(-1);
  const band =
    first && last
      ? first.puntosStr + ' ' + last.puntosStr.trim().split(/\s+/).reverse().join(' ')
      : null;
  const xFin = geo.ancho - geo.padRight;
  const yFin = geo.alto - geo.padBottom;

  const gridY = geo.marcasY
    .map(
      (m) => `
      <line x1="${geo.padLeft}" y1="${m.pos.toFixed(1)}" x2="${xFin}" y2="${m.pos.toFixed(1)}" stroke="${tone.ink}" stroke-opacity="0.13" stroke-width="1" />
      <text x="${geo.padLeft - 6}" y="${(m.pos + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#5C6B7A">${m.etiqueta}</text>`,
    )
    .join('');

  const gridX = geo.marcasX
    .map(
      (m) => `
      <line x1="${m.pos.toFixed(1)}" y1="${geo.padTop}" x2="${m.pos.toFixed(1)}" y2="${yFin}" stroke="${tone.ink}" stroke-opacity="0.13" stroke-width="1" />
      <text x="${m.pos.toFixed(1)}" y="${yFin + 14}" text-anchor="middle" font-size="10" fill="#5C6B7A">${m.etiqueta}</text>`,
    )
    .join('');

  const curvas = geo.curvasReferencia
    .map((c) => {
      const limit = c === first || c === last;
      const median = c.etiqueta === '0' || c.etiqueta === 'P50';
      return `
      <polyline fill="none" stroke="${tone.ink}" stroke-opacity="${limit || median ? 0.76 : 0.42}" stroke-width="${median ? 1.7 : 1.25}" ${limit || c.punteada ? 'stroke-dasharray="4,3"' : ''} points="${c.puntosStr}" />
      <text x="${xFin + 4}" y="${(c.etiquetaY + 3).toFixed(1)}" font-size="9" font-weight="bold" fill="${tone.ink}">${c.etiqueta}</text>`;
    })
    .join('');

  const trayectoria = geo.trayectoriaStr
    ? `<polyline fill="none" stroke="${tone.ink}" stroke-width="2.2" points="${geo.trayectoriaStr}" />`
    : '';

  const puntos = geo.puntosPaciente
    .map((p) => {
      const anillo = p.esAtipico
        ? `<circle cx="${p.svgX.toFixed(1)}" cy="${p.svgY.toFixed(1)}" r="7" fill="none" stroke="#C62828" stroke-width="2" />`
        : '';
      return `
      ${anillo}
      <circle cx="${p.svgX.toFixed(1)}" cy="${p.svgY.toFixed(1)}" r="4" fill="${tone.ink}" stroke="${tone.surface}" stroke-width="1.5" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.ancho} ${geo.alto}" width="100%" style="max-height:280px; background:${tone.surface}; border:1px solid ${tone.surface}; border-radius:6px;">
    <rect x="0" y="0" width="${geo.ancho}" height="${geo.alto}" fill="${tone.surface}" />
    ${gridY}
    ${gridX}
    <line x1="${geo.padLeft}" y1="${geo.padTop}" x2="${geo.padLeft}" y2="${yFin}" stroke="${tone.ink}" stroke-opacity="0.5" stroke-width="1.2" />
    <line x1="${geo.padLeft}" y1="${yFin}" x2="${xFin}" y2="${yFin}" stroke="${tone.ink}" stroke-opacity="0.5" stroke-width="1.2" />
    ${band ? `<polygon points="${band}" fill="${tone.ink}" fill-opacity="0.08" />` : ''}
    ${curvas}
    ${trayectoria}
    ${puntos}
    <text x="${(geo.padLeft + xFin) / 2}" y="${geo.alto - 6}" text-anchor="middle" font-size="11" font-weight="bold" fill="${tone.ink}">${geo.tituloEjeX}</text>
    <text x="12" y="${(geo.padTop + yFin) / 2}" text-anchor="middle" font-size="11" font-weight="bold" fill="${tone.ink}" transform="rotate(-90 12 ${(geo.padTop + yFin) / 2})">${geo.unidadY}</text>
  </svg>`;
}
