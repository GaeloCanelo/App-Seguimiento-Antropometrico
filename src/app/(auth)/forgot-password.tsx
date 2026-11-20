import { Link } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { ResponsiveContainer } from '../../views/components/ResponsiveContainer';
import { theme } from '../../views/theme/tokens';

/** CU-03: Recuperar contraseña sin revelar si el correo está registrado. */
export default function ForgotPasswordScreen() {
  const { authManager, hayConexion } = useApp();
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    if (!authManager) return;
    setError(null);
    setMensaje(null);
    setCargando(true);
    try {
      await authManager.recuperarContrasena(correo, hayConexion);
      setMensaje(
        'Si el correo corresponde a una cuenta registrada, recibirás un enlace para restablecer tu contraseña.',
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ResponsiveContainer variant="form" centered>
      <Text style={styles.title}>Recuperar contraseña</Text>
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}
      {mensaje ? <Text style={styles.okBox}>{mensaje}</Text> : null}

      <FormField
        label="Correo electrónico"
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <PrimaryButton title="Enviar enlace de recuperación" onPress={enviar} loading={cargando} />

      <View style={styles.footer}>
        <Link href="/(auth)/login" style={styles.link}>
          Volver a iniciar sesión
        </Link>
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.primary, marginBottom: theme.spacing.lg },
  errorBox: {
    backgroundColor: '#FDECEA',
    color: theme.colors.danger,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  okBox: {
    backgroundColor: '#E8F5E9',
    color: theme.colors.success,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  footer: { marginTop: theme.spacing.lg, alignItems: 'center' },
  link: { color: theme.colors.primary, fontWeight: '600' },
});
