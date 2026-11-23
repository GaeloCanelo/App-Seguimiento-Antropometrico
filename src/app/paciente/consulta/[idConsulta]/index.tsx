import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CATALOGO_INDICADORES,
  clasificarIndicador,
  formatearEdadMesesYDias,
} from '../../../../domain';
import { useConsultationViewModel } from '../../../../viewmodels/useConsultationViewModel';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalDisclaimerBanner } from '../../../../views/components/ClinicalDisclaimerBanner';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { theme } from '../../../../views/theme/tokens';

/** CU-17: Consultar resultados e interpretación referencial de una consulta. */
export default function ConsultaResultadosScreen() {
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, cargando } = useResultsViewModel(idConsulta);
  const { eliminarConsulta } = useConsultationViewModel();

  if (cargando || !detalle || !paciente) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando resultados...</Text>
      </View>
    );
  }

  const { consulta, resultados } = detalle;
  const edadTexto = formatearEdadMesesYDias(paciente.fecha_nacimiento, consulta.fecha_consulta).texto;

  const confirmarBaja = () => {
    Alert.alert('Eliminar consulta', 'La consulta desaparecerá del historial, curvas y reportes.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarConsulta(consulta.id_consulta);
          router.replace(`/paciente/${paciente.id_paciente}`);
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ClinicalDisclaimerBanner />

      <View style={styles.summaryCard}>
        <Text style={styles.folio}>
          {paciente.folio_clinico} · {consulta.fecha_consulta}
        </Text>
        <Text style={styles.name}>{paciente.nombre}</Text>
        <Text style={styles.meta}>
          Edad: {edadTexto} · IMC: {consulta.imc.toFixed(2)} kg/m²
        </Text>
        {consulta.atipico_confirmado ? (
          <Text style={styles.atipico}>Consulta con valor(es) atípico(s) confirmado(s)</Text>
        ) : null}
      </View>

      {CATALOGO_INDICADORES.map((meta) => {
        const res = resultados.find((r) => r.codigo_indicador === meta.codigo_indicador);
        const aplica = res && res.estado === 'CALCULADO' && res.puntaje_z !== null;
        const clasif =
          aplica && res.puntaje_z !== null
            ? clasificarIndicador(meta.codigo_indicador, res.puntaje_z)
            : null;

        return (
          <View key={meta.codigo_indicador} style={styles.resultCard}>
            <Text style={styles.indTitle}>{meta.nombre}</Text>
            {aplica && res.puntaje_z !== null && res.percentil !== null && clasif ? (
              <>
                <Text style={styles.metrics}>
                  Puntaje Z: <Text style={styles.bold}>{res.puntaje_z.toFixed(2)}</Text> ·
                  Percentil: <Text style={styles.bold}>{res.percentil.toFixed(1)}</Text>
                </Text>
                <Text style={[styles.clasif, { color: clasif.colorHex }]}>{clasif.etiqueta}</Text>
              </>
            ) : (
              <Text style={styles.muted}>
                No aplica{res?.motivo_no_aplica ? ` — ${res.motivo_no_aplica}` : ''}
              </Text>
            )}
          </View>
        );
      })}

      <View style={styles.actions}>
        <PrimaryButton
          title="Ver curvas de crecimiento"
          onPress={() => router.push(`/paciente/${paciente.id_paciente}/curvas`)}
        />
        <PrimaryButton
          title="Reporte PDF"
          variant="secondary"
          onPress={() => router.push(`/paciente/consulta/${consulta.id_consulta}/reporte`)}
        />
        <PrimaryButton
          title="Corregir consulta"
          variant="secondary"
          onPress={() => router.push(`/paciente/consulta/${consulta.id_consulta}/editar`)}
        />
        <PrimaryButton title="Eliminar consulta" variant="danger" onPress={confirmarBaja} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  folio: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  name: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  atipico: { fontSize: 12, fontWeight: '700', color: theme.colors.warning, marginTop: 6 },
  resultCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  indTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  metrics: { fontSize: 14, color: theme.colors.text, marginTop: 4 },
  bold: { fontWeight: '700' },
  clasif: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  muted: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl },
});
