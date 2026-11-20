import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { GeometriaCurvaOMS, PuntoPacienteSvg } from '../../services/growthChartBuilder';
import { theme } from '../theme/tokens';

interface GrowthCurveSvgProps {
  geometria: GeometriaCurvaOMS;
  idConsultaSeleccionada?: string | null;
  onSeleccionarPunto?: (punto: PuntoPacienteSvg) => void;
}

/**
 * Componente vectorial interactivo para visualizar curvas OMS (Z / Percentiles)
 * y la trayectoria cronológica de consultas del paciente (CU-18).
 */
export function GrowthCurveSvg({
  geometria,
  idConsultaSeleccionada,
  onSeleccionarPunto,
}: GrowthCurveSvgProps) {
  const xFin = geometria.ancho - geometria.padRight;
  const yFin = geometria.alto - geometria.padBottom;
  const aspectRatio = geometria.ancho / geometria.alto;

  return (
    <View style={[styles.wrapper, { aspectRatio }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${geometria.ancho} ${geometria.alto}`}
      >
        <Rect x={0} y={0} width={geometria.ancho} height={geometria.alto} fill="#FFFFFF" rx={8} />

        {/* Rejilla horizontal (eje Y) */}
        {geometria.marcasY.map((m, idx) => (
          <G key={`y-${idx}`}>
            <Line
              x1={geometria.padLeft}
              y1={m.pos}
              x2={xFin}
              y2={m.pos}
              stroke="#E6ECF2"
              strokeWidth={1}
            />
            <SvgText
              x={geometria.padLeft - 6}
              y={m.pos + 3}
              textAnchor="end"
              fontSize={10}
              fill={theme.colors.textMuted}
            >
              {m.etiqueta}
            </SvgText>
          </G>
        ))}

        {/* Rejilla vertical (eje X) */}
        {geometria.marcasX.map((m, idx) => (
          <G key={`x-${idx}`}>
            <Line
              x1={m.pos}
              y1={geometria.padTop}
              x2={m.pos}
              y2={yFin}
              stroke="#E6ECF2"
              strokeWidth={1}
            />
            <SvgText
              x={m.pos}
              y={yFin + 14}
              textAnchor="middle"
              fontSize={10}
              fill={theme.colors.textMuted}
            >
              {m.etiqueta}
            </SvgText>
          </G>
        ))}

        {/* Ejes principales */}
        <Line
          x1={geometria.padLeft}
          y1={geometria.padTop}
          x2={geometria.padLeft}
          y2={yFin}
          stroke="#9AA8B8"
          strokeWidth={1.2}
        />
        <Line
          x1={geometria.padLeft}
          y1={yFin}
          x2={xFin}
          y2={yFin}
          stroke="#9AA8B8"
          strokeWidth={1.2}
        />

        {/* Curvas de referencia OMS */}
        {geometria.curvasReferencia.map((curva) => (
          <G key={curva.id}>
            <Polyline
              fill="none"
              stroke={curva.color}
              strokeWidth={1.6}
              strokeDasharray={curva.punteada ? '4,3' : undefined}
              points={curva.puntosStr}
            />
            <SvgText
              x={xFin + 4}
              y={curva.etiquetaY + 3}
              fontSize={9}
              fontWeight="bold"
              fill={curva.color}
            >
              {curva.etiqueta}
            </SvgText>
          </G>
        ))}

        {/* Trayectoria cronológica del paciente (solo si hay >= 2 puntos) */}
        {geometria.trayectoriaStr ? (
          <Polyline
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth={2.4}
            points={geometria.trayectoriaStr}
          />
        ) : null}

        {/* Puntos de consultas con área táctil amplia */}
        {geometria.puntosPaciente.map((punto) => {
          const seleccionado = punto.id_consulta === idConsultaSeleccionada;
          return (
            <G key={punto.id_consulta}>
              {punto.esAtipico ? (
                <Circle
                  cx={punto.svgX}
                  cy={punto.svgY}
                  r={8}
                  fill="none"
                  stroke={theme.colors.danger}
                  strokeWidth={2}
                />
              ) : null}
              {seleccionado ? (
                <Circle
                  cx={punto.svgX}
                  cy={punto.svgY}
                  r={10}
                  fill="rgba(15, 76, 129, 0.16)"
                />
              ) : null}
              <Circle
                cx={punto.svgX}
                cy={punto.svgY}
                r={seleccionado ? 5.5 : 4.2}
                fill={punto.esAtipico ? theme.colors.warning : theme.colors.primary}
                stroke="#FFFFFF"
                strokeWidth={1.6}
              />
              {onSeleccionarPunto ? (
                <Circle
                  cx={punto.svgX}
                  cy={punto.svgY}
                  r={18}
                  fill="transparent"
                  onPress={() => onSeleccionarPunto(punto)}
                />
              ) : null}
            </G>
          );
        })}

        {/* Títulos de ejes */}
        <SvgText
          x={(geometria.padLeft + xFin) / 2}
          y={geometria.alto - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={theme.colors.text}
        >
          {geometria.tituloEjeX}
        </SvgText>
        <SvgText
          x={14}
          y={(geometria.padTop + yFin) / 2}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill={theme.colors.text}
          rotation={-90}
          originX={14}
          originY={(geometria.padTop + yFin) / 2}
        >
          {geometria.unidadY}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
});
