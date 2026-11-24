import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

/** Aviso obligatorio en resultados, curvas y PDF (HU-17 / CU-17). */
export function ClinicalDisclaimerBanner() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Clasificación referencial, no diagnóstica.</Text>
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    banner: {
      backgroundColor: theme.colors.primaryLight,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      marginBottom: theme.spacing.md,
    },
    text: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
