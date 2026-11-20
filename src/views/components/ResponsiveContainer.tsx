import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { theme } from '../theme/tokens';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  variant?: 'default' | 'form';
  centered?: boolean;
  contentStyle?: ViewStyle;
}

/**
 * Contenedor adaptativo que evita formularios o tarjetas excesivamente estiradas
 * en tabletas mientras aprovecha todo el ancho útil en teléfonos (RNF-06).
 */
export function ResponsiveContainer({
  children,
  scrollable = true,
  variant = 'default',
  centered = false,
  contentStyle,
}: ResponsiveContainerProps) {
  const { esTableta, paddingHorizontal, maxWidthContenido, maxWidthFormulario } =
    useResponsiveLayout();
  const maxWidth = variant === 'form' ? maxWidthFormulario : maxWidthContenido;

  const inner = (
    <View
      style={[
        styles.inner,
        esTableta && { maxWidth, alignSelf: 'center', width: '100%' },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!scrollable) {
    return (
      <View
        style={[
          styles.base,
          { paddingHorizontal, paddingTop: theme.spacing.md },
          centered && styles.centered,
        ]}
      >
        {inner}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal },
        centered && styles.centeredGrow,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {inner}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  centered: {
    justifyContent: 'center',
  },
  centeredGrow: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
  },
});
