import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { AppProvider } from '../viewmodels/AppProvider';
import { theme } from '../views/theme/tokens';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="paciente/[id]/index" options={{ title: 'Historial del paciente' }} />
        <Stack.Screen name="paciente/[id]/editar" options={{ title: 'Editar paciente' }} />
        <Stack.Screen name="paciente/[id]/nueva-consulta" options={{ title: 'Nueva consulta' }} />
        <Stack.Screen name="paciente/[id]/curvas" options={{ title: 'Curvas de crecimiento OMS' }} />
        <Stack.Screen
          name="paciente/consulta/[idConsulta]/index"
          options={{ title: 'Resultados de consulta' }}
        />
        <Stack.Screen
          name="paciente/consulta/[idConsulta]/editar"
          options={{ title: 'Corregir consulta' }}
        />
        <Stack.Screen
          name="paciente/consulta/[idConsulta]/reporte"
          options={{ title: 'Reporte clínico PDF' }}
        />
      </Stack>
    </AppProvider>
  );
}
