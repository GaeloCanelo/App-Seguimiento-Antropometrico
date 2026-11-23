import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useApp } from '../../viewmodels/AppProvider';
import { theme } from '../../views/theme/tokens';

export default function TabsLayout() {
  const { medico } = useApp();

  if (!medico) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
      }}
    >
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes', tabBarLabel: 'Pacientes' }} />
      <Tabs.Screen
        name="registrar-paciente"
        options={{ title: 'Registrar paciente', tabBarLabel: 'Nuevo' }}
      />
      <Tabs.Screen name="cuenta" options={{ title: 'Cuenta', tabBarLabel: 'Cuenta' }} />
    </Tabs>
  );
}
