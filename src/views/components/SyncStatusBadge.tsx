import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

interface SyncStatusBadgeProps {
  hayConexion: boolean;
  sincronizando: boolean;
  pendientes: number;
  ultimoError: string | null;
  onSincronizar?: () => void;
  pill?: boolean;
}

/** Indicador claro de estado Local-First / Sincronización (CU-20). */
export function SyncStatusBadge({
  hayConexion,
  sincronizando,
  pendientes,
  ultimoError,
  onSincronizar,
  pill = false,
}: SyncStatusBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  let etiqueta = 'Sincronizado';
  let color: string = pill ? theme.colors.successInk : theme.colors.success;

  const pendientesTexto =
    pendientes === 1 ? '1 cambio pendiente' : `${pendientes} cambios pendientes`;
  if (!hayConexion) {
    etiqueta = pendientes > 0 ? `Sin conexión · ${pendientesTexto}` : 'Sin conexión';
    color = theme.colors.warning;
  } else if (sincronizando) {
    etiqueta = 'Sincronizando…';
    color = theme.colors.info;
  } else if (ultimoError) {
    etiqueta = `Error de sincronización · ${pendientesTexto}`;
    color = theme.colors.danger;
  } else if (pendientes > 0) {
    etiqueta = pendientesTexto;
    color = theme.colors.warning;
  }

  if (pill) {
    return (
      <View
        style={[
          styles.container,
          styles.pill,
          {
            backgroundColor:
              color === theme.colors.successInk ? theme.colors.successLight : theme.colors.surface,
          },
        ]}
      >
        <Text accessibilityLiveRegion="polite" style={[styles.label, { color }]}>
          {etiqueta}
        </Text>
        {sincronizando ? (
          <ActivityIndicator size="small" color={color} style={styles.spinner} />
        ) : null}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onSincronizar}
      disabled={!hayConexion || sincronizando || !onSincronizar}
      style={[styles.container, { borderColor: color }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{etiqueta}</Text>
      {sincronizando && <ActivityIndicator size="small" color={color} style={styles.spinner} />}
    </Pressable>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.surface,
    },
    pill: {
      minHeight: 34,
      minWidth: 114,
      borderWidth: 0,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
    },
    spinner: {
      marginLeft: 6,
    },
  });
