import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { useApp } from '../../viewmodels/AppProvider';

export default function AuthLayout() {
  const { medico } = useApp();

  if (medico) {
    return <Redirect href="/(tabs)/pacientes" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
