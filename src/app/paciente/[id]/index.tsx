import { folioVisible } from '../../../views/utils/patientDisplay';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatearEdadMesesYDias } from '../../../domain';
import { usePatientsViewModel } from '../../../viewmodels/usePatientsViewModel';
import { useResultsViewModel } from '../../../viewmodels/useResultsViewModel';
import { ClinicalScreen } from '../../../views/components/ClinicalScreen';
import { DesignSvg } from '../../../views/components/DesignSvg';
import { KidoLogCard } from '../../../views/components/KidoLogCard';
import {
  GradientCard,
  IconAction,
  Notice,
  ScreenFeedback,
  useUI,
} from '../../../views/components/KidoLogUI';
import { PrimaryButton } from '../../../views/components/PrimaryButton';
import { useThemedStyles } from '../../../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../../../views/theme/tokens';
import { displayDate } from '../../../views/utils/clinicalDisplay';

import { useDialog } from '../../../views/components/DialogProvider';

export default function PacienteHistorialScreen() {
  const dialog = useDialog();
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, historialConsultas, cargando, error } = useResultsViewModel(undefined, id);
  const { eliminarPaciente } = usePatientsViewModel();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!paciente)
    return (
      <ClinicalScreen title="Expediente">
        <ScreenFeedback loading={cargando} error={error} empty="Paciente no encontrado." />
      </ClinicalScreen>
    );

  const age = formatearEdadMesesYDias(
    paciente.fecha_nacimiento,
    new Date().toISOString().slice(0, 10),
  ).texto;
  const patientRoute = `/paciente/${paciente.id_paciente}` as const;
  const eliminar = () => {
    dialog('Eliminar paciente', 'Se eliminará el paciente junto con sus consultas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void eliminarPaciente(paciente.id_paciente).then(
            () => router.dismissTo('/(tabs)/pacientes'),
            (reason: unknown) =>
              setDeleteError(
                reason instanceof Error ? reason.message : 'No fue posible eliminar el paciente.',
              ),
          );
        },
      },
    ]);
  };
  const opciones = () =>
    dialog('Opciones del paciente', undefined, [
      { text: 'Editar paciente', onPress: () => router.push(`${patientRoute}/editar`) },
      { text: 'Eliminar paciente', style: 'destructive' as const, onPress: eliminar },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  const count = historialConsultas.length;
  const lastVisit = historialConsultas[0]?.consulta.fecha_consulta;

  return (
    <ClinicalScreen
      title="Expediente"
      action={<IconAction icon="dots" label="Opciones del paciente" onPress={opciones} onHero />}
    >
      <GradientCard style={styles.profile}>
        <View style={ui.row}>
          <View style={styles.avatar}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <DesignSvg name="record-avatar" />
            </View>
            <Text style={styles.initial}>
              {Array.from(paciente.nombre.trim())[0]?.toLocaleUpperCase('es-MX')}
            </Text>
          </View>
          <View style={ui.grow}>
            <Text style={ui.section}>{paciente.nombre}</Text>
            <Text style={ui.muted}>
              {folioVisible(paciente.folio_clinico)} ·{' '}
              {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}
            </Text>
          </View>
        </View>
        <View style={styles.metadata}>
          <Text style={styles.pill}>{age}</Text>
          <Text style={styles.pill}>Nacimiento · {displayDate(paciente.fecha_nacimiento)}</Text>
          {lastVisit ? (
            <Text style={styles.pill}>Última consulta · {displayDate(lastVisit)}</Text>
          ) : null}
        </View>
      </GradientCard>
      <View style={styles.actions}>
        <View style={styles.action}>
          <PrimaryButton
            title="Nueva consulta"
            variant="accent"
            onPress={() => router.push(`${patientRoute}/nueva-consulta`)}
          />
        </View>
        {count ? (
          <View style={styles.action}>
            <PrimaryButton
              title="Ver curvas OMS"
              variant="secondary"
              onPress={() => router.push(`${patientRoute}/curvas`)}
            />
          </View>
        ) : null}
      </View>
      {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}
      <View style={ui.between}>
        <Text accessibilityRole="header" style={[ui.section, ui.grow]}>
          Historial de consultas
        </Text>
        <Text style={ui.muted}>
          {count} {count === 1 ? 'consulta' : 'consultas'}
        </Text>
      </View>
      {error || !count ? (
        <ScreenFeedback
          loading={cargando}
          error={error}
          empty="Aún no hay consultas registradas."
        />
      ) : null}
      {historialConsultas.map(({ consulta }) => (
        <Link
          key={consulta.id_consulta}
          href={`/paciente/consulta/${consulta.id_consulta}`}
          asChild
        >
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => pressed && styles.visitPressed}
          >
            <KidoLogCard style={[ui.row, styles.visit]}>
              <View style={styles.dateTile}>
                <DesignSvg name="record-calendar" size={20} />
              </View>
              <View style={ui.grow}>
                <Text style={ui.title}>{displayDate(consulta.fecha_consulta)}</Text>
                <Text style={ui.muted}>
                  {consulta.peso_kg.toFixed(2)} kg · {consulta.longitud_talla_cm.toFixed(1)} cm · PC{' '}
                  {consulta.perimetro_cefalico_cm.toFixed(1)} cm
                </Text>
                {consulta.atipico_confirmado ? (
                  <Text style={styles.atypical}>Atípico confirmado</Text>
                ) : null}
              </View>
              <DesignSvg name="record-chevron" />
            </KidoLogCard>
          </Pressable>
        </Link>
      ))}
    </ClinicalScreen>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    profile: { minHeight: 145, justifyContent: 'space-between', gap: theme.spacing.md },
    metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    pill: {
      color: theme.colors.primaryInk,
      backgroundColor: theme.colors.surface,
      fontWeight: '700',
      fontSize: 12,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    initial: { color: theme.colors.onHero, ...theme.typography.avatar },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    action: { flex: 1, minWidth: 130 },
    dateTile: {
      width: 42,
      height: 42,
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    visit: { minHeight: 76, paddingHorizontal: theme.spacing.md },
    visitPressed: { opacity: 0.7 },
    atypical: { color: theme.colors.danger, ...theme.typography.caption },
  });
