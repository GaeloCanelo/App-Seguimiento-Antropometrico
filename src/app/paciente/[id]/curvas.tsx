import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CATALOGO_INDICADORES,
  CodigoIndicador,
  generarSerieCurvaReferencia,
} from '../../../domain';
import { useResultsViewModel } from '../../../viewmodels/useResultsViewModel';
import { ClinicalDisclaimerBanner } from '../../../views/components/ClinicalDisclaimerBanner';
import { theme } from '../../../views/theme/tokens';

/**
 * CU-18: Visualización de curvas de crecimiento OMS (Puntajes Z vs Percentiles).
 * TODO(Integrante 6): Renderizar el componente vectorial SVG interactivo con `react-native-svg`
 * consumiendo `serieReferencia` y los puntos cronológicos de `historialConsultas`.
 */
export default function CurvasCrecimientoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, historialConsultas, cargando } = useResultsViewModel(undefined, id);
  const [indicador, setIndicador] = useState<CodigoIndicador>('P_E');
  const [vista, setVista] = useState<'Z' | 'PERCENTIL'>('Z');

  const niveles = useMemo(
    () => (vista === 'Z' ? [-3, -2, -1, 0, 1, 2, 3] : [-1.881, -1.036, 0, 1.036, 1.881]),
    [vista],
  );

  const serieReferencia = useMemo(() => {
    if (!paciente) return null;
    return generarSerieCurvaReferencia({
      indicador,
      sexo: paciente.sexo,
      zNiveles: niveles,
    });
  }, [indicador, niveles, paciente]);

  if (cargando || !paciente) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando curvas de crecimiento...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ClinicalDisclaimerBanner />

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
            style={[styles.chip, vista === op && styles.chipSelected]}
          >
            <Text style={[styles.chipText, vista === op && styles.chipTextSelected]}>
              {op === 'Z' ? 'Puntajes Z (-3 a +3)' : 'Percentiles (P3–P97)'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartTitle}>
          Curva OMS ({indicador}) · {paciente.sexo === 'M' ? 'Niños' : 'Niñas'} · Vista {vista}
        </Text>
        <Text style={styles.muted}>
          Puntos de referencia calculados: {serieReferencia?.eje.length ?? 0} · Consultas del
          paciente: {historialConsultas.length}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextSelected: { color: theme.colors.primary },
  chartPlaceholder: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.primary, textAlign: 'center' },
  muted: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center' },
});
