import { StyleSheet, Text, View } from 'react-native';
import type { Consulta } from '../../domain';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

type Measurements = Pick<Consulta, 'peso_kg' | 'longitud_talla_cm' | 'perimetro_cefalico_cm'>;

export function ClinicalMetrics({ consulta }: { consulta: Measurements }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const metrics = [
    {
      label: 'Peso',
      value: consulta.peso_kg.toFixed(2),
      unit: 'kg',
      surface: colors.primaryLight,
      ink: colors.primaryInk,
    },
    {
      label: 'Longitud o talla',
      value: consulta.longitud_talla_cm.toFixed(1),
      unit: 'cm',
      surface: colors.indigoSurface,
      ink: colors.indigoInk,
    },
    {
      label: 'Perímetro cefálico',
      value: consulta.perimetro_cefalico_cm.toFixed(1),
      unit: 'cm',
      surface: colors.blueSurface,
      ink: colors.blueInk,
    },
  ];

  return (
    <View style={styles.row}>
      {metrics.map(({ label, value, unit, surface, ink }) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}, ${value} ${unit}`}
          style={[styles.tile, { backgroundColor: surface }]}
        >
          <Text style={[styles.label, { color: ink }]}>{label}</Text>
          <Text style={[styles.value, { color: ink }]}>
            {value} <Text style={styles.unit}>{unit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: theme.spacing.sm },
    tile: {
      flex: 1,
      minWidth: 88,
      flexBasis: 88,
      padding: theme.spacing.compact,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    label: { ...theme.typography.label, fontSize: 11 },
    value: { ...theme.typography.sectionTitle },
    unit: { ...theme.typography.caption },
  });
