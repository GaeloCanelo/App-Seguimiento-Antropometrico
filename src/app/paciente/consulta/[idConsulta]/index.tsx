import { folioVisible } from '../../../../views/utils/patientDisplay';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CATALOGO_INDICADORES,
  clasificarIndicador,
  formatearEdadMesesYDias,
  type CodigoIndicador,
} from '../../../../domain';
import { useConsultationViewModel } from '../../../../viewmodels/useConsultationViewModel';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalMetrics } from '../../../../views/components/ClinicalMetrics';
import { ClinicalScreen } from '../../../../views/components/ClinicalScreen';
import { DesignSvg } from '../../../../views/components/DesignSvg';
import {
  GradientCard,
  IconAction,
  Notice,
  ScreenFeedback,
  useUI,
} from '../../../../views/components/KidoLogUI';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { useAppearance, useThemedStyles } from '../../../../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../../../../views/theme/tokens';
import { displayDate } from '../../../../views/utils/clinicalDisplay';
import { classificationInk, indicatorDesign } from '../../../../views/utils/indicators';

import { useDialog } from '../../../../views/components/DialogProvider';

const clinicalInfo = 'Clasificación referencial, no diagnóstica.';

export default function ConsultaResultadosScreen() {
  const dialog = useDialog();
  const styles = useThemedStyles(createStyles);
  const { theme, mode } = useAppearance();
  const ui = useUI();
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, cargando, error } = useResultsViewModel(idConsulta);
  const { eliminarConsulta } = useConsultationViewModel();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  if (!detalle || !paciente)
    return (
      <ClinicalScreen title="Resultados OMS">
        <ScreenFeedback loading={cargando} error={error} empty="Consulta no encontrada." />
      </ClinicalScreen>
    );

  const { consulta, resultados } = detalle;
  const age = formatearEdadMesesYDias(paciente.fecha_nacimiento, consulta.fecha_consulta).texto;
  const consultationRoute = `/paciente/consulta/${consulta.id_consulta}` as const;
  const abrirCurva = (indicador?: CodigoIndicador) =>
    router.push({
      pathname: '/paciente/[id]/curvas',
      params: { id: paciente.id_paciente, consulta: consulta.id_consulta, indicador },
    });

  const borrar = () =>
    dialog(
      'Eliminar consulta',
      'La consulta desaparecerá del historial, las curvas y los reportes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void eliminarConsulta(consulta.id_consulta).then(
              () => router.dismissTo(`/paciente/${paciente.id_paciente}`),
              (reason: unknown) =>
                setDeleteError(
                  reason instanceof Error ? reason.message : 'No fue posible eliminar la consulta.',
                ),
            );
          },
        },
      ],
    );
  const opciones = () =>
    dialog('Opciones de consulta', undefined, [
      { text: 'Editar consulta', onPress: () => router.push(`${consultationRoute}/editar`) },
      {
        text: 'Sobre los resultados',
        onPress: () =>
          dialog('Sobre los resultados', clinicalInfo, [{ text: 'Cerrar', style: 'cancel' }]),
      },
      { text: 'Eliminar consulta', style: 'destructive', onPress: borrar },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  return (
    <ClinicalScreen
      title="Resultados OMS"
      info={clinicalInfo}
      action={<IconAction icon="dots" label="Opciones de consulta" onPress={opciones} onHero />}
    >
      <GradientCard style={ui.row}>
        <DesignSvg name="record-calendar" size={20} />
        <View style={ui.grow}>
          <Text style={ui.title}>
            {displayDate(consulta.fecha_consulta)} · {folioVisible(paciente.folio_clinico)}
          </Text>
          <Text style={ui.muted}>
            {paciente.nombre} · {age}
          </Text>
          <Text style={ui.muted}>IMC {consulta.imc.toFixed(2)} kg/m²</Text>
          {consulta.atipico_confirmado ? (
            <Text style={[ui.muted, { color: theme.colors.warning }]}>
              Valores atípicos confirmados
            </Text>
          ) : null}
        </View>
      </GradientCard>
      <ClinicalMetrics consulta={consulta} />
      <View style={styles.actions}>
        <View style={styles.action}>
          <PrimaryButton title="Ver curvas" variant="secondary" onPress={() => abrirCurva()} />
        </View>
        <View style={styles.action}>
          <PrimaryButton
            title="Reporte PDF"
            onPress={() => router.push(`${consultationRoute}/reporte`)}
          />
        </View>
      </View>

      {error || deleteError ? <Notice tone="error">{deleteError ?? error ?? ''}</Notice> : null}
      <View style={styles.results}>
        <View style={styles.sectionIntro}>
          <Text accessibilityRole="header" style={ui.section}>
            Indicadores antropométricos
          </Text>
          <Text style={ui.muted}>Toca un indicador para ver su curva.</Text>
        </View>
        {CATALOGO_INDICADORES.map((meta) => {
          const code = meta.codigo_indicador;
          const design = indicatorDesign[code];
          const tone = design[mode];
          const result = resultados.find((row) => row.codigo_indicador === code);
          const valid =
            result?.estado === 'CALCULADO' &&
            result.puntaje_z !== null &&
            result.percentil !== null;
          const classification =
            valid && result.puntaje_z !== null ? clasificarIndicador(code, result.puntaje_z) : null;
          return (
            <Pressable
              key={code}
              accessibilityRole="link"
              accessibilityHint="Abre la curva de crecimiento de este indicador"
              onPress={() => abrirCurva(code)}
              style={({ pressed }) => [
                styles.resultCard,
                { backgroundColor: tone.surface },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: tone.ink }]}>
                <DesignSvg name={design.icon} size={20} tint={tone.onInk} />
              </View>
              <View style={styles.resultCopy}>
                <Text style={[ui.title, { color: tone.ink }]}>{meta.nombre}</Text>
                {valid && classification ? (
                  <>
                    <View style={styles.metrics}>
                      <Text style={[styles.metric, { color: tone.ink }]}>
                        <Text style={ui.muted}>Z </Text>
                        {result.puntaje_z?.toFixed(2)}
                      </Text>
                      <Text style={[styles.metric, { color: tone.ink }]}>
                        <Text style={ui.muted}>Percentil </Text>
                        {result.percentil?.toFixed(1)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        ui.muted,
                        { color: classificationInk(classification.severidad, theme, tone.ink) },
                      ]}
                    >
                      {classification.etiqueta}
                      {result.es_atipico ? ' · Atípico' : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={ui.muted}>
                    No aplica{result?.motivo_no_aplica ? ` · ${result.motivo_no_aplica}` : ''}
                  </Text>
                )}
              </View>
              <DesignSvg name="record-chevron" size={18} tint={tone.ink} />
            </Pressable>
          );
        })}
      </View>
    </ClinicalScreen>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    results: { gap: theme.spacing.sm },
    sectionIntro: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.compact,
      borderRadius: theme.radius.card,
      padding: theme.spacing.compact,
    },
    resultCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.compact },
    metric: { ...theme.typography.label, fontVariant: ['tabular-nums'] },
    pressed: { opacity: 0.72 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actions: { flexDirection: 'row', gap: theme.spacing.compact, flexWrap: 'wrap' },
    action: { flex: 1, minWidth: 112 },
  });
