import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../viewmodels/AppProvider';
import { theme } from '../views/theme/tokens';

export default function IndexScreen() {
  const { listo, errorInicializacion, medico } = useApp();

  if (!listo) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Cargando referencias OMS y base local...</Text>
      </View>
    );
  }

  if (errorInicializacion) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorInicializacion}</Text>
      </View>
    );
  }

  if (medico) {
    return <Redirect href="/(tabs)/pacientes" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
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
