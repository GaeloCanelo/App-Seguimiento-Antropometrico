import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Paciente } from '../../domain';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { displayDate } from '../utils/clinicalDisplay';
import { edadPaciente, folioVisible } from '../utils/patientDisplay';
import { DesignSvg } from './DesignSvg';
import { KidoLogCard } from './KidoLogCard';
import { KidoLogIcon } from './KidoLogIcon';

export function PatientCard({ patient }: { patient: Paciente }) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const folio = folioVisible(patient.folio_clinico);
  const sex = patient.sexo === 'M' ? 'Masculino' : 'Femenino';
  const birthDate = displayDate(patient.fecha_nacimiento);
  const age = edadPaciente(patient.fecha_nacimiento);
  const initials =
    patient.nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => Array.from(part)[0] ?? '')
      .join('')
      .toLocaleUpperCase('es-MX') || '—';

  return (
    <Link href={`/paciente/${patient.id_paciente}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityHint="Abre el expediente"
        accessibilityLabel={`${patient.nombre}, folio ${folio}, ${sex}, nacimiento ${birthDate}${age ? `, edad ${age}` : ''}`}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <KidoLogCard style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>{initials}</Text>
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{patient.nombre}</Text>
              <Text style={styles.folio}>Folio {folio}</Text>
            </View>
            <View style={styles.chevron}>
              <KidoLogIcon name="chevron" />
            </View>
          </View>
          <View style={styles.details}>
            <View style={styles.birth}>
              <DesignSvg name="calendar" size={17} tint={theme.colors.indigoInk} />
              <View style={styles.valueBlock}>
                <Text style={styles.meta}>Nacimiento</Text>
                <Text style={styles.value}>{birthDate}</Text>
              </View>
            </View>
            <View style={styles.valueBlock}>
              <Text style={styles.meta}>{sex}</Text>
              {age ? <Text style={styles.value}>{age}</Text> : null}
            </View>
          </View>
        </KidoLogCard>
      </Pressable>
    </Link>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    card: { padding: theme.spacing.compact, gap: theme.spacing.compact },
    header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
    pressed: { opacity: 0.74 },
    avatar: {
      minWidth: 46,
      minHeight: 46,
      paddingHorizontal: 6,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    initial: { color: theme.colors.primaryInk, ...theme.typography.avatar, fontSize: 16 },
    nameBlock: { flex: 1, minWidth: 0, gap: 4 },
    name: { color: theme.colors.text, ...theme.typography.sectionTitle, fontSize: 15 },
    meta: { color: theme.colors.textMuted, ...theme.typography.caption },
    folio: { color: theme.colors.primaryInk, ...theme.typography.caption },
    value: { color: theme.colors.indigoInk, ...theme.typography.label },
    chevron: {
      width: 30,
      height: 30,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.compact,
      backgroundColor: theme.colors.indigoSurface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.compact,
    },
    birth: {
      flex: 1,
      minWidth: 110,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    valueBlock: { minWidth: 95, flex: 1, gap: 3 },
  });
