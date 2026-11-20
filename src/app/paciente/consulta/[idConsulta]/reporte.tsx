import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  construirNombreArchivoPdf,
  generarYCompartirReportePdf,
} from '../../../../services/pdfReportService';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalDisclaimerBanner } from '../../../../views/components/ClinicalDisclaimerBanner';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { theme } from '../../../../views/theme/tokens';

/** CU-19: Vista previa y exportación de reporte PDF anonimizado ([Folio]_[Fecha].pdf). */
export default function ReportePdfScreen() {
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, cargando } = useResultsViewModel(idConsulta);
  const [exportando, setExportando] = useState(false);

  if (cargando || !detalle || !paciente) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Preparando vista previa del reporte...</Text>
      </View>
    );
  }

  const nombreArchivo = construirNombreArchivoPdf(
    paciente.folio_clinico,
    detalle.consulta.fecha_consulta,
  );

  const exportar = async () => {
    setExportando(true);
    try {
      await generarYCompartirReportePdf({ paciente, detalle });
    } catch (err: unknown) {
      Alert.alert('Error al generar PDF', err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ClinicalDisclaimerBanner />

      <View style={styles.previewCard}>
        <Text style={styles.title}>Vista previa de exportación</Text>
        <Text style={styles.meta}>Archivo anonimizado: {nombreArchivo}</Text>
        <Text style={styles.meta}>
          Paciente: {paciente.nombre} ({paciente.folio_clinico})
        </Text>
        <Text style={styles.meta}>Fecha de consulta: {detalle.consulta.fecha_consulta}</Text>
        <Text style={styles.meta}>
          Indicadores incluidos: {detalle.resultados.length} · Atípico confirmado:{' '}
          {detalle.consulta.atipico_confirmado ? 'Sí' : 'No'}
        </Text>
      </View>

      {/* TODO(Integrante 6): embeber gráfica SVG estática en la vista previa y en `generarYCompartirReportePdf` */}
      <PrimaryButton title="Exportar PDF" onPress={exportar} loading={exportando} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  meta: { fontSize: 13, color: theme.colors.text },
  muted: { fontSize: 14, color: theme.colors.textMuted },
});
