import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/tokens';

interface SyncStatusBadgeProps {
  hayConexion: boolean;
  sincronizando: boolean;
  pendientes: number;
  ultimoError: string | null;
  onSincronizar?: () => void;
}

/** Indicador claro de estado Local-First / Sincronización (CU-20). */
export function SyncStatusBadge({
  hayConexion,
  sincronizando,
  pendientes,
  ultimoError,
  onSincronizar,
}: SyncStatusBadgeProps) {
  let etiqueta = 'Sincronizado';
  let color: string = theme.colors.success;

  if (!hayConexion) {
    etiqueta = pendientes > 0 ? `Sin conexión · ${pendientes} pendiente(s)` : 'Sin conexión';
    color = theme.colors.warning;
  } else if (sincronizando) {
    etiqueta = 'Sincronizando...';
    color = theme.colors.info;
  } else if (ultimoError) {
    etiqueta = `Error de sync · ${pendientes} pendiente(s)`;
    color = theme.colors.danger;
  } else if (pendientes > 0) {
    etiqueta = `Pendiente (${pendientes})`;
    color = theme.colors.warning;
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

const styles = StyleSheet.create({
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
