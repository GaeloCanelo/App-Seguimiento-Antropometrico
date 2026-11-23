import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CambiosPendientesError } from '../../data';
import { useApp } from '../../viewmodels/AppProvider';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { SyncStatusBadge } from '../../views/components/SyncStatusBadge';
import { theme } from '../../views/theme/tokens';

/** CU-04, CU-05 y CU-06: Perfil, correo, contraseña, cierre seguro y eliminación de cuenta. */
export default function CuentaScreen() {
  const {
    medico,
    authManager,
    hayConexion,
    sincronizando,
    pendientesSync,
    ultimoErrorSync,
    sincronizarAhora,
    establecerMedicoActivo,
  } = useApp();

  const [nombre, setNombre] = useState(medico?.nombre ?? '');
  const [apellidos, setApellidos] = useState(medico?.apellidos ?? '');
  const [correo, setCorreo] = useState(medico?.correo ?? '');
  const [passParaCorreo, setPassParaCorreo] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirmacion, setPassConfirmacion] = useState('');
  const [cambiandoPass, setCambiandoPass] = useState(false);

  const [modalEliminarVisible, setModalEliminarVisible] = useState(false);
  const [passEliminar, setPassEliminar] = useState('');
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);

  useEffect(() => {
    if (!medico) return;
    setNombre(medico.nombre ?? '');
    setApellidos(medico.apellidos ?? '');
    setCorreo(medico.correo);
  }, [medico]);

  const correoCambio = Boolean(medico && correo.trim() !== medico.correo);

  const guardarPerfil = async () => {
    if (!authManager || !medico) return;
    if (correoCambio && !passParaCorreo) {
      Alert.alert(
        'Confirmación requerida',
        'Para cambiar tu correo electrónico, captura también tu contraseña actual.',
      );
      return;
    }

    setGuardandoPerfil(true);
    try {
      const actualizado = await authManager.actualizarDatosCuenta({
        uid_medico: medico.uid_medico,
        nombre: nombre.trim() || null,
        apellidos: apellidos.trim() || null,
        correo: correo.trim(),
        contrasenaActual: passParaCorreo || undefined,
        hayConexion,
      });
      establecerMedicoActivo(actualizado);
      setPassParaCorreo('');
      Alert.alert('Cuenta actualizada', 'Los datos de tu cuenta se guardaron correctamente.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const manejarCambioContrasena = async () => {
    if (!authManager) return;
    setCambiandoPass(true);
    try {
      await authManager.cambiarContrasena({
        contrasenaActual: passActual,
        nuevaContrasena: passNueva,
        confirmacion: passConfirmacion,
        hayConexion,
      });
      setPassActual('');
      setPassNueva('');
      setPassConfirmacion('');
      Alert.alert('Contraseña actualizada', 'Tu contraseña se actualizó correctamente.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setCambiandoPass(false);
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
                Alert.alert('Cambios pendientes sin sincronizar', err.message, [
                  {
                    text: 'Sincronizar ahora',
                    onPress: () => void sincronizarAhora(),
                  },
                  {
                    text: 'Salir y descartar pendientes',
                    style: 'destructive',
                    onPress: async () => {
                      await authManager.cerrarSesion(medico.uid_medico, true);
                      establecerMedicoActivo(null);
                      router.replace('/(auth)/login');
                    },
                  },
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              } else {
                Alert.alert('Error', err instanceof Error ? err.message : 'Error al cerrar sesión.');
              }
            }
          },
        },
      ],
    );
  };

  const abrirModalEliminar = () => {
    if (!hayConexion) {
      Alert.alert('Sin conexión', 'La eliminación de cuenta requiere conexión a internet.');
      return;
    }
    setPassEliminar('');
    setModalEliminarVisible(true);
  };

  const confirmarEliminacionDefinitiva = async () => {
    if (!authManager || !medico) return;
    if (!passEliminar) {
      Alert.alert('Contraseña requerida', 'Ingresa tu contraseña para confirmar.');
      return;
    }
    setEliminandoCuenta(true);
    try {
      await authManager.eliminarCuenta({
        uid_medico: medico.uid_medico,
        contrasena: passEliminar,
        hayConexion,
      });
      setModalEliminarVisible(false);
      establecerMedicoActivo(null);
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No fue posible eliminar la cuenta.');
    } finally {
      setEliminandoCuenta(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.syncRow}>
        <SyncStatusBadge
          hayConexion={hayConexion}
          sincronizando={sincronizando}
          pendientes={pendientesSync}
          ultimoError={ultimoErrorSync}
          onSincronizar={sincronizarAhora}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos del médico (CU-04)</Text>
        <FormField label="Nombre(s)" value={nombre} onChangeText={setNombre} />
        <FormField label="Apellidos" value={apellidos} onChangeText={setApellidos} />
        <FormField
          label="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {correoCambio ? (
          <FormField
            label="Contraseña actual (requerida para cambiar correo)"
            value={passParaCorreo}
            onChangeText={setPassParaCorreo}
            secureTextEntry
          />
        ) : null}
        <PrimaryButton title="Guardar datos" onPress={guardarPerfil} loading={guardandoPerfil} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambiar contraseña (CU-04)</Text>
        <FormField
          label="Contraseña actual"
          value={passActual}
          onChangeText={setPassActual}
          secureTextEntry
        />
        <FormField
          label="Nueva contraseña"
          value={passNueva}
          onChangeText={setPassNueva}
          secureTextEntry
          hint="Mínimo 8 caracteres"
        />
        <FormField
          label="Confirmar nueva contraseña"
          value={passConfirmacion}
          onChangeText={setPassConfirmacion}
          secureTextEntry
        />
        <PrimaryButton
          title="Cambiar contraseña"
          variant="secondary"
          onPress={manejarCambioContrasena}
          loading={cambiandoPass}
        />
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Cerrar sesión" onPress={solicitarCerrarSesion} variant="secondary" />
        <PrimaryButton title="Eliminar cuenta" onPress={abrirModalEliminar} variant="danger" />
      </View>

      <Modal
        visible={modalEliminarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEliminarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Eliminar cuenta definitivamente</Text>
            <Text style={styles.modalBody}>
              Esta acción es irreversible. Se eliminará tu cuenta, todos tus pacientes y todas sus
              consultas tanto del dispositivo como de la nube.
            </Text>
            <FormField
              label="Confirma tu contraseña"
              value={passEliminar}
              onChangeText={setPassEliminar}
              secureTextEntry
              placeholder="Contraseña actual"
            />
            <View style={styles.modalActions}>
              <View style={styles.flex}>
                <PrimaryButton
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => setModalEliminarVisible(false)}
                  disabled={eliminandoCuenta}
                />
              </View>
              <View style={styles.flex}>
                <PrimaryButton
                  title="Eliminar todo"
                  variant="danger"
                  onPress={confirmarEliminacionDefinitiva}
                  loading={eliminandoCuenta}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
  syncRow: { marginBottom: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  actions: { gap: theme.spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.danger, marginBottom: 8 },
  modalBody: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.md },
  modalActions: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
