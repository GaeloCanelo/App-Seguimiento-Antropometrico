import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { ResponsiveContainer } from '../../views/components/ResponsiveContainer';
import { theme } from '../../views/theme/tokens';

/** CU-01: Crear cuenta con correo y contraseña (>= 8 caracteres). */
export default function RegisterScreen() {
  const { authManager, hayConexion, establecerMedicoActivo } = useApp();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const manejarRegistro = async () => {
    if (!authManager) return;
    setError(null);
    setCargando(true);
    try {
      const medico = await authManager.crearCuenta({
        correo,
        contrasena,
        confirmacion,
        hayConexion,
      });
      establecerMedicoActivo(medico);
      router.replace('/(tabs)/pacientes');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ResponsiveContainer variant="form" centered>
      <Text style={styles.title}>Crear cuenta médica</Text>
      <Text style={styles.subtitle}>Requiere conexión a internet para el registro inicial.</Text>

      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <FormField
        label="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <FormField
        label="Contraseña"
        value={contrasena}
        onChangeText={setContrasena}
        secureTextEntry
        hint="Mínimo 8 caracteres"
      />
      <FormField
        label="Confirmar contraseña"
        value={confirmacion}
        onChangeText={setConfirmacion}
        secureTextEntry
      />

      <PrimaryButton title="Crear cuenta" onPress={manejarRegistro} loading={cargando} />

      <View style={styles.footer}>
        <Link href="/(auth)/login" style={styles.link}>
          Ya tengo cuenta · Iniciar sesión
        </Link>
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginBottom: theme.spacing.lg },
  errorBox: {
    backgroundColor: '#FDECEA',
    color: theme.colors.danger,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  footer: { marginTop: theme.spacing.lg, alignItems: 'center' },
  link: { color: theme.colors.primary, fontWeight: '600' },
});
