import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CATALOGO_INDICADORES, CodigoIndicador } from '../../../domain';
import {
  PuntoPacienteSvg,
  VistaCurva,
  construirGeometriaCurvaOMS,
  inferirTablaPTInicial,
} from '../../../services/growthChartBuilder';
import { useResultsViewModel } from '../../../viewmodels/useResultsViewModel';
import { ClinicalDisclaimerBanner } from '../../../views/components/ClinicalDisclaimerBanner';
import { GrowthCurveSvg } from '../../../views/components/GrowthCurveSvg';
import { theme } from '../../../views/theme/tokens';

/**
 * CU-18: Visualización interactiva de curvas de crecimiento OMS (Puntajes Z y Percentiles).
 */
export default function CurvasCrecimientoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, historialConsultas, cargando } = useResultsViewModel(undefined, id);

  const [indicador, setIndicador] = useState<CodigoIndicador>('P_E');
  const [vista, setVista] = useState<VistaCurva>('Z');
  const [tipoTablaPT, setTipoTablaPT] = useState<'LONGITUD' | 'TALLA'>('LONGITUD');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState<PuntoPacienteSvg | null>(null);

  useEffect(() => {
    if (historialConsultas.length > 0) {
      setTipoTablaPT(inferirTablaPTInicial(historialConsultas));
    }
  }, [historialConsultas]);

  const geometria = useMemo(() => {
    if (!paciente) return null;
    return construirGeometriaCurvaOMS({
      indicador,
      sexo: paciente.sexo,
      vista,
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: historialConsultas,
      tipoTablaPT,
    });
  }, [historialConsultas, indicador, paciente, tipoTablaPT, vista]);

  // Seleccionar el punto más reciente automáticamente al cambiar indicador o vista
  useEffect(() => {
    if (!geometria || geometria.puntosPaciente.length === 0) {
      setPuntoSeleccionado(null);
      return;
    }
    setPuntoSeleccionado((prev) => {
      const coincidencia = prev
        ? geometria.puntosPaciente.find((p) => p.id_consulta === prev.id_consulta)
        : null;
      return coincidencia ?? geometria.puntosPaciente[geometria.puntosPaciente.length - 1];
    });
  }, [geometria]);

  if (cargando || !paciente || !geometria) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando curvas de crecimiento...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ClinicalDisclaimerBanner />

      <Text style={styles.patientHeader}>
        {paciente.folio_clinico} · {paciente.nombre} ({paciente.sexo === 'M' ? 'Niño' : 'Niña'})
      </Text>

      <View style={styles.chipRow}>
        {CATALOGO_INDICADORES.map((item) => (
          <Pressable
            key={item.codigo_indicador}
            onPress={() => setIndicador(item.codigo_indicador)}
            style={[styles.chip, indicador === item.codigo_indicador && styles.chipSelected]}
          >
            <Text
              style={[
                styles.chipText,
                indicador === item.codigo_indicador && styles.chipTextSelected,
              ]}
            >
              {item.codigo_indicador}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toggleRow}>
        {(['Z', 'PERCENTIL'] as const).map((op) => (
          <Pressable
            key={op}
            onPress={() => setVista(op)}
            style={[styles.chip, styles.flexChip, vista === op && styles.chipSelected]}
          >
            <Text style={[styles.chipText, vista === op && styles.chipTextSelected]}>
              {op === 'Z' ? 'Puntajes Z (-3 a +3)' : 'Percentiles (P3–P97)'}
            </Text>
          </Pressable>
        ))}
      </View>

      {indicador === 'P_T' ? (
        <View style={styles.toggleRow}>
          {(['LONGITUD', 'TALLA'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setTipoTablaPT(tab)}
              style={[styles.chip, styles.flexChip, tipoTablaPT === tab && styles.chipSelected]}
            >
              <Text style={[styles.chipText, tipoTablaPT === tab && styles.chipTextSelected]}>
                {tab === 'LONGITUD' ? 'Longitud (< 24m · 45–110 cm)' : 'Talla (≥ 24m · 65–120 cm)'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <GrowthCurveSvg
        geometria={geometria}
        idConsultaSeleccionada={puntoSeleccionado?.id_consulta}
        onSeleccionarPunto={setPuntoSeleccionado}
      />

      <Text style={styles.hint}>Toca un punto de la gráfica para inspeccionar esa consulta.</Text>

      {puntoSeleccionado ? (
        <View style={styles.detailCard}>
          <View style={styles.detailTop}>
            <Text style={styles.detailTitle}>
              Consulta {puntoSeleccionado.fecha_consulta} ({puntoSeleccionado.edadTexto})
            </Text>
            {puntoSeleccionado.esAtipico ? (
              <Text style={styles.atipicoTag}>Atípico</Text>
            ) : null}
          </View>
          <Text style={styles.detailMetric}>
            Valor: {puntoSeleccionado.valorObservado.toFixed(2)} {geometria.unidadY} · Puntaje Z:{' '}
            {puntoSeleccionado.puntajeZ.toFixed(2)} · Percentil:{' '}
            {puntoSeleccionado.percentil.toFixed(1)}
          </Text>
          <Text style={[styles.detailClasif, { color: puntoSeleccionado.clasificacionColor }]}>
            {puntoSeleccionado.clasificacionEtiqueta}
          </Text>
        </View>
      ) : null}

      {geometria.puntosOmitidos.length > 0 ? (
        <View style={styles.omittedBox}>
          <Text style={styles.omittedTitle}>Consultas no graficadas en este indicador:</Text>
          {geometria.puntosOmitidos.map((om) => (
            <Text key={om.id_consulta} style={styles.omittedItem}>
              • {om.fecha_consulta}: {om.motivo}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  patientHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.sm },
  flexChip: { flex: 1, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  chipTextSelected: { color: theme.colors.primary },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: theme.spacing.md,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  atipicoTag: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
    backgroundColor: '#FDECEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailMetric: { fontSize: 13, color: theme.colors.text, marginTop: 6 },
  detailClasif: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  omittedBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  omittedTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  omittedItem: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  muted: { fontSize: 13, color: theme.colors.textMuted },
});
