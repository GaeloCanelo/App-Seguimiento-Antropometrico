import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../viewmodels/AppProvider';
import { Masthead } from '../views/components/Masthead';
import { ScreenFrame } from '../views/components/KidoLogUI';
import { mensajeEnEspanol } from '../views/utils/formErrors';
import { Welcome } from '../views/components/Welcome';
import { useTheme, useThemedStyles } from '../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../views/theme/tokens';

export default function IndexScreen() {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const { listo, errorInicializacion, medico } = useApp();

  if (!listo) {
    return (
      <ScreenFrame bottom masthead={<Masthead title="KidoLog" compact />}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.text}>Cargando referencias OMS y base local...</Text>
        </View>
      </ScreenFrame>
    );
  }

  if (errorInicializacion) {
    return (
      <ScreenFrame bottom masthead={<Masthead title="KidoLog" compact />}>
        <View style={styles.center}>
          <Text style={styles.error}>
            {mensajeEnEspanol(
              { message: errorInicializacion },
              'No se pudo cargar KidoLog. Vuelve a abrir la aplicación.',
            )}
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  if (medico) {
    return <Redirect href="/(tabs)/pacientes" />;
  }

  return <Welcome />;
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    text: {
      marginTop: theme.spacing.md,
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    error: {
      color: theme.colors.danger,
      textAlign: 'center',
      fontSize: 15,
    },
  });
