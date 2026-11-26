import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as RouterThemeProvider } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppProvider } from '../viewmodels/AppProvider';
import { DialogProvider } from '../views/components/DialogProvider';
import { ThemeProvider, useAppearance, useThemedStyles } from '../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../views/theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AppProvider>
          <Navigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Navigator() {
  const { theme, mode, ready, reduceMotion } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const routingTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      primary: theme.colors.primaryInk,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    PlusJakartaSans_700Bold,
  });
  return (
    <RouterThemeProvider value={routingTheme}>
      <StatusBar
        style={ready && (fontsLoaded || fontError) ? 'light' : mode === 'dark' ? 'light' : 'dark'}
      />
      <DialogProvider>
        {ready && (fontsLoaded || fontError) ? (
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduceMotion ? 'none' : 'default',
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="paciente/[id]/index" options={{ title: 'Expediente' }} />
            <Stack.Screen name="paciente/[id]/editar" options={{ title: 'Editar paciente' }} />
            <Stack.Screen
              name="paciente/[id]/nueva-consulta"
              options={{ title: 'Nueva consulta' }}
            />
            <Stack.Screen name="paciente/[id]/curvas" options={{ title: 'Curvas OMS' }} />
            <Stack.Screen
              name="paciente/consulta/[idConsulta]/index"
              options={{ title: 'Resultados OMS' }}
            />
            <Stack.Screen
              name="paciente/consulta/[idConsulta]/editar"
              options={{ title: 'Editar consulta' }}
            />
            <Stack.Screen
              name="paciente/consulta/[idConsulta]/reporte"
              options={{ title: 'Reporte PDF' }}
            />
          </Stack>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator
              accessibilityLabel="Cargando KidoLog"
              color={theme.colors.primaryInk}
            />
          </View>
        )}
      </DialogProvider>
    </RouterThemeProvider>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });
