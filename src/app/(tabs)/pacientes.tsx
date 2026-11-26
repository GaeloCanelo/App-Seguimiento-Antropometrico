import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { usePatientsViewModel } from '../../viewmodels/usePatientsViewModel';
import { FormField } from '../../views/components/FormField';
import { KidoLogCard } from '../../views/components/KidoLogCard';
import { KidoLogIcon } from '../../views/components/KidoLogIcon';
import { LoadingSkeleton, Notice, ScreenFrame, useUI } from '../../views/components/KidoLogUI';
import { Masthead } from '../../views/components/Masthead';
import { PatientCard } from '../../views/components/PatientCard';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { HeaderAction } from '../../views/components/ScreenHeader';
import { SyncStatusBadge } from '../../views/components/SyncStatusBadge';
import { useTheme, useThemedStyles } from '../../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../../views/theme/tokens';

export default function PacientesScreen() {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const theme = useTheme();
  const { hayConexion, sincronizando, pendientesSync, ultimoErrorSync, sincronizarAhora } =
    useApp();
  const { pacientes, busqueda, setBusqueda, cargarPacientes, cargando, error } =
    usePatientsViewModel();

  useFocusEffect(
    useCallback(() => {
      void cargarPacientes(busqueda);
    }, [busqueda, cargarPacientes, sincronizando]),
  );

  const filtered = Boolean(busqueda.trim());
  const count = pacientes.length;
  return (
    <ScreenFrame
      masthead={
        <Masthead
          title="Pacientes"
          description="Expedientes y seguimiento del crecimiento"
          actions={
            <>
              <HeaderAction
                icon="settings"
                label="Ajustes"
                onPress={() => router.navigate('/(tabs)/cuenta')}
              />
              <HeaderAction
                icon="cloud"
                label="Sincronizar ahora"
                disabled={!hayConexion || sincronizando}
                onPress={() => {
                  void sincronizarAhora();
                }}
              />
            </>
          }
        />
      }
    >
      <FlatList
        data={pacientes}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustsScrollIndicatorInsets={false}
        keyExtractor={(item) => item.id_paciente}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={PatientSeparator}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <KidoLogCard style={styles.searchPanel}>
              <FormField
                appearance="search"
                icon="search"
                accessibilityLabel="Buscar por nombre o folio"
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o folio"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              <SyncStatusBadge
                pill
                hayConexion={hayConexion}
                sincronizando={sincronizando}
                pendientes={pendientesSync}
                ultimoError={ultimoErrorSync}
              />
            </KidoLogCard>
            <View style={styles.sectionHeader}>
              <View style={ui.grow}>
                <Text accessibilityRole="header" style={ui.section}>
                  {filtered ? 'Resultados' : 'Expedientes'}
                </Text>
                {!cargando && !error ? (
                  <Text style={ui.muted}>
                    {count} {count === 1 ? 'paciente' : 'pacientes'}
                  </Text>
                ) : null}
              </View>
              <Link href="/(tabs)/registrar-paciente" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Registrar paciente"
                  style={({ pressed }) => [styles.register, pressed && styles.pressed]}
                >
                  <KidoLogIcon name="plus" size={17} color={theme.colors.primaryInk} />
                  <Text style={ui.link}>Registrar</Text>
                </Pressable>
              </Link>
            </View>
            {error ? (
              <>
                <Notice tone="error">{error}</Notice>
                <PrimaryButton
                  title="Reintentar"
                  variant="secondary"
                  onPress={() => {
                    void cargarPacientes();
                  }}
                />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <LoadingSkeleton />
          ) : error ? undefined : (
            <KidoLogCard style={styles.empty}>
              <View style={styles.emptyIcon}>
                <KidoLogIcon name={filtered ? 'search' : 'users'} size={26} />
              </View>
              <Text style={ui.section}>
                {filtered ? 'Sin resultados' : 'Aún no hay expedientes'}
              </Text>
              <Text style={[ui.muted, styles.centerText]}>
                {filtered
                  ? 'Revisa el nombre o el folio que escribiste.'
                  : 'Registra un paciente para empezar a documentar sus consultas.'}
              </Text>
              <PrimaryButton
                title={filtered ? 'Limpiar búsqueda' : 'Registrar paciente'}
                variant="secondary"
                onPress={() =>
                  filtered ? setBusqueda('') : router.navigate('/(tabs)/registrar-paciente')
                }
              />
            </KidoLogCard>
          )
        }
        renderItem={({ item }) => <PatientCard patient={item} />}
      />
    </ScreenFrame>
  );
}

function PatientSeparator() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.separator} />;
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
    },
    listHeader: { gap: theme.spacing.lg, marginBottom: theme.spacing.md },
    searchPanel: { padding: theme.spacing.compact, gap: theme.spacing.sm },
    sectionHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    register: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.compact,
      paddingVertical: 6,
      backgroundColor: theme.colors.primaryPill,
      borderRadius: theme.radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    pressed: { opacity: 0.69 },
    separator: { height: theme.spacing.compact },
    empty: { alignItems: 'center', paddingVertical: theme.spacing.lg, gap: theme.spacing.compact },
    emptyIcon: {
      width: 50,
      height: 50,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    centerText: { textAlign: 'center' },
  });
