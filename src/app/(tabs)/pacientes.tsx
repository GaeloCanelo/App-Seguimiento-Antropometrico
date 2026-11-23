import { Link, useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { usePatientsViewModel } from '../../viewmodels/usePatientsViewModel';
import { ResponsiveContainer } from '../../views/components/ResponsiveContainer';
import { SyncStatusBadge } from '../../views/components/SyncStatusBadge';
import { useResponsiveLayout } from '../../views/hooks/useResponsiveLayout';
import { theme } from '../../views/theme/tokens';

/** CU-08: Lista y búsqueda de pacientes por folio o nombre (adaptable a teléfono y tableta). */
export default function PacientesScreen() {
  const { hayConexion, sincronizando, pendientesSync, ultimoErrorSync, sincronizarAhora } =
    useApp();
  const { pacientes, busqueda, setBusqueda, cargarPacientes } = usePatientsViewModel();
  const { esTableta } = useResponsiveLayout();

  useFocusEffect(
    useCallback(() => {
      void cargarPacientes(busqueda);
    }, [busqueda, cargarPacientes]),
  );

  return (
    <ResponsiveContainer scrollable={false} contentStyle={styles.flex}>
      <View style={styles.topBar}>
        <SyncStatusBadge
          hayConexion={hayConexion}
          sincronizando={sincronizando}
          pendientes={pendientesSync}
          ultimoError={ultimoErrorSync}
          onSincronizar={sincronizarAhora}
        />
      </View>

      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por folio o nombre..."
        placeholderTextColor={theme.colors.textMuted}
        style={styles.searchInput}
      />

      <FlatList
        key={esTableta ? 'grid-2' : 'list-1'}
        numColumns={esTableta ? 2 : 1}
        columnWrapperStyle={esTableta ? styles.columnGap : undefined}
        data={pacientes}
        keyExtractor={(item) => item.id_paciente}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {busqueda.trim() ? 'Sin resultados' : 'Aún no tienes pacientes registrados.'}
            </Text>
            {!busqueda.trim() ? (
              <Link href="/(tabs)/registrar-paciente" style={styles.emptyLink}>
                + Registrar primer paciente
              </Link>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/paciente/${item.id_paciente}`} asChild>
            <Pressable style={[styles.card, esTableta && styles.cardTablet]}>
              <View style={styles.cardHeader}>
                <Text style={styles.folio}>{item.folio_clinico}</Text>
                <Text style={styles.sexo}>{item.sexo === 'M' ? 'Niño' : 'Niña'}</Text>
              </View>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.meta}>Nacimiento: {item.fecha_nacimiento}</Text>
            </Pressable>
          </Link>
        )}
      />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { marginBottom: theme.spacing.sm },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  columnGap: { gap: theme.spacing.sm },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTablet: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  folio: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  sexo: { fontSize: 12, color: theme.colors.textMuted },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: theme.spacing.xl, gap: 8 },
  emptyText: { color: theme.colors.textMuted, fontSize: 15 },
  emptyLink: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
});
