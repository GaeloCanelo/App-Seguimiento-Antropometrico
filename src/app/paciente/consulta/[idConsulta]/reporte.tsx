import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CATALOGO_INDICADORES,
  CodigoIndicador,
  clasificarIndicador,
  formatearEdadMesesYDias,
} from '../../../../domain';
import { construirGeometriaCurvaOMS } from '../../../../services/growthChartBuilder';
import {
  construirNombreArchivoPdf,
  generarYCompartirReportePdf,
} from '../../../../services/pdfReportService';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalDisclaimerBanner } from '../../../../views/components/ClinicalDisclaimerBanner';
import { GrowthCurveSvg } from '../../../../views/components/GrowthCurveSvg';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { ResponsiveContainer } from '../../../../views/components/ResponsiveContainer';
import { theme } from '../../../../views/theme/tokens';

/** CU-19: Vista previa completa y exportación de reporte PDF anonimizado ([Folio]_[Fecha].pdf). */
export default function ReportePdfScreen() {
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, historialConsultas, cargando } = useResultsViewModel(idConsulta);
  const [indicadorGrafica, setIndicadorGrafica] = useState<CodigoIndicador>('P_E');
  const [exportando, setExportando] = useState(false);

  const geometriaGrafica = useMemo(() => {
    if (!paciente || !detalle) return null;
    const consultasHastaFecha = historialConsultas.filter(
      (c) => c.consulta.fecha_consulta <= detalle.consulta.fecha_consulta,
    );
    return construirGeometriaCurvaOMS({
      indicador: indicadorGrafica,
      sexo: paciente.sexo,
      vista: 'Z',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: consultasHastaFecha.length > 0 ? consultasHastaFecha : [detalle],
    });
  }, [detalle, historialConsultas, indicadorGrafica, paciente]);

  if (cargando || !detalle || !paciente || !geometriaGrafica) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Preparando vista previa del reporte...</Text>
      </View>
    );
  }

  const { consulta, resultados } = detalle;
  const nombreArchivo = construirNombreArchivoPdf(paciente.folio_clinico, consulta.fecha_consulta);
  const edadTexto = formatearEdadMesesYDias(paciente.fecha_nacimiento, consulta.fecha_consulta).texto;

  const exportar = async () => {
    setExportando(true);
    try {
      await generarYCompartirReportePdf({
        paciente,
        detalle,
        historialConsultas,
        indicadorGrafica,
      });
    } catch (err: unknown) {
      Alert.alert('Error al generar PDF', err instanceof Error ? err.message : 'Intenta de nuevo.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <ResponsiveContainer>
      <ClinicalDisclaimerBanner />

      <View style={styles.previewCard}>
        <Text style={styles.title}>Vista previa del reporte clínico</Text>
        <Text style={styles.fileBadge}>Archivo a exportar: {nombreArchivo}</Text>
        <Text style={styles.meta}>
          Folio: {paciente.folio_clinico} · Nombre: {paciente.nombre}
        </Text>
        <Text style={styles.meta}>
          Sexo: {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'} · Edad: {edadTexto} · Fecha:{' '}
          {consulta.fecha_consulta}
        </Text>
        <Text style={styles.meta}>
          Peso: {consulta.peso_kg.toFixed(2)} kg · Talla: {consulta.longitud_talla_cm.toFixed(1)} cm
          (Ajustada: {consulta.longitud_talla_ajustada_cm.toFixed(1)} cm) · PC:{' '}
          {consulta.perimetro_cefalico_cm.toFixed(1)} cm
        </Text>

        {consulta.atipico_confirmado ? (
          <Text style={styles.atipicoBox}>
            Marca clínica: Consulta con valor(es) atípico(s) confirmado(s).
          </Text>
        ) : null}

        <View style={styles.table}>
          {CATALOGO_INDICADORES.map((meta) => {
            const r = resultados.find((x) => x.codigo_indicador === meta.codigo_indicador);
            const aplica = r && r.estado === 'CALCULADO' && r.puntaje_z !== null && r.percentil !== null;
            const clasif =
              aplica && r.puntaje_z !== null
                ? clasificarIndicador(meta.codigo_indicador, r.puntaje_z)
                : null;

            return (
              <View key={meta.codigo_indicador} style={styles.tableRow}>
                <Text style={styles.tableInd}>{meta.codigo_indicador}</Text>
                {aplica && r.puntaje_z !== null && r.percentil !== null && clasif ? (
                  <Text style={styles.tableVal}>
                    Z: {r.puntaje_z.toFixed(2)} · P: {r.percentil.toFixed(1)} ·{' '}
                    <Text style={{ color: clasif.colorHex, fontWeight: '700' }}>
                      {clasif.etiqueta}
                    </Text>
                    {r.es_atipico ? ' [Atípico]' : ''}
                  </Text>
                ) : (
                  <Text style={styles.tableVal}>No aplica</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Gráfica incluida en el PDF:</Text>
      <View style={styles.chipRow}>
        {CATALOGO_INDICADORES.map((item) => (
          <Pressable
            key={item.codigo_indicador}
            onPress={() => setIndicadorGrafica(item.codigo_indicador)}
            style={[
              styles.chip,
              indicadorGrafica === item.codigo_indicador && styles.chipSelected,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                indicadorGrafica === item.codigo_indicador && styles.chipTextSelected,
              ]}
            >
              {item.codigo_indicador}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chartWrapper}>
        <GrowthCurveSvg geometria={geometriaGrafica} idConsultaSeleccionada={consulta.id_consulta} />
      </View>

      <PrimaryButton title="Exportar PDF" onPress={exportar} loading={exportando} />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  fileBadge: { fontSize: 12, fontWeight: '700', color: theme.colors.accent, marginBottom: 4 },
  meta: { fontSize: 13, color: theme.colors.text },
  atipicoBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  table: { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, gap: 6 },
  tableRow: { flexDirection: 'row', gap: 8 },
  tableInd: { width: 52, fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  tableVal: { flex: 1, fontSize: 12, color: theme.colors.text },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.sm },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  chipTextSelected: { color: theme.colors.primary },
  chartWrapper: { marginBottom: theme.spacing.md },
  muted: { fontSize: 14, color: theme.colors.textMuted },
});
