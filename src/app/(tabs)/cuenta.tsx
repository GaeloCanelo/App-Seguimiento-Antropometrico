import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CambiosPendientesError } from '../../data';
import { useApp } from '../../viewmodels/AppProvider';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { theme } from '../../views/theme/tokens';

/** CU-04, CU-05 y CU-06: Gestión de cuenta, cierre seguro y eliminación. */
export default function CuentaScreen() {
  const { medico, authManager, hayConexion, establecerMedicoActivo } = useApp();
  const [nombre, setNombre] = useState(medico?.nombre ?? '');
  const [apellidos, setApellidos] = useState(medico?.apellidos ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardarPerfil = async () => {
    if (!authManager || !medico) return;
    setGuardando(true);
    try {
      const actualizado = await authManager.actualizarDatosCuenta({
        uid_medico: medico.uid_medico,
        nombre: nombre.trim() || null,
        apellidos: apellidos.trim() || null,
        hayConexion,
      });
      establecerMedicoActivo(actualizado);
      Alert.alert('Cuenta actualizada', 'Los datos del perfil se guardaron correctamente.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setGuardando(false);
    }
  };

  const solicitarCerrarSesion = () => {
    if (!authManager || !medico) return;
    Alert.alert(
      'Cerrar sesión',
      'Se limpiarán los datos locales de este dispositivo. Podrás recuperarlos al iniciar sesión de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await authManager.cerrarSesion(medico.uid_medico, false);
              establecerMedicoActivo(null);
              router.replace('/(auth)/login');
            } catch (err: unknown) {
              if (err instanceof CambiosPendientesError) {
                Alert.alert(
                  'Cambios pendientes sin sincronizar',
                  err.message,
                  [
                    { text: 'Esperar', style: 'cancel' },
                    {
                      text: 'Salir y descartar pendientes',
                      style: 'destructive',
                      onPress: async () => {
                        await authManager.cerrarSesion(medico.uid_medico, true);
                        establecerMedicoActivo(null);
                        router.replace('/(auth)/login');
                      },
                    },
                  ],
                );
              } else {
                Alert.alert('Error', err instanceof Error ? err.message : 'Error al cerrar sesión.');
              }
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.email}>{medico?.correo}</Text>
      <FormField label="Nombre(s)" value={nombre} onChangeText={setNombre} />
      <FormField label="Apellidos" value={apellidos} onChangeText={setApellidos} />

      <View style={styles.actions}>
        <PrimaryButton title="Guardar datos" onPress={guardarPerfil} loading={guardando} />
        {/* TODO(Integrante 4): agregar secciones para cambio de correo/contraseña (CU-04) y eliminación de cuenta (CU-06) */}
        <PrimaryButton title="Cerrar sesión" onPress={solicitarCerrarSesion} variant="danger" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
  email: { fontSize: 15, fontWeight: '600', color: theme.colors.primary, marginBottom: theme.spacing.md },
  actions: { gap: theme.spacing.md, marginTop: theme.spacing.sm },
});
