import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { ResponsiveContainer } from '../../views/components/ResponsiveContainer';
import { theme } from '../../views/theme/tokens';

/** CU-02: Iniciar sesión con persistencia offline tras el primer acceso. */
export default function LoginScreen() {
  const { authManager, hayConexion, establecerMedicoActivo } = useApp();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async () => {
    if (!authManager) return;
    setError(null);
    setCargando(true);
    try {
      const medico = await authManager.iniciarSesion({ correo, contrasena, hayConexion });
      establecerMedicoActivo(medico);
      router.replace('/(tabs)/pacientes');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ResponsiveContainer variant="form" centered>
        <Text style={styles.title}>Seguimiento Antropométrico</Text>
        <Text style={styles.subtitle}>Consulta pediátrica 0–5 años (OMS 2006)</Text>

        {error ? <Text style={styles.errorBox}>{error}</Text> : null}

        <FormField
          label="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="medico@consultorio.mx"
        />

        <FormField
          label="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          placeholder="Mínimo 8 caracteres"
        />

        <PrimaryButton title="Iniciar sesión" onPress={manejarLogin} loading={cargando} />

        <View style={styles.links}>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/(auth)/register" style={styles.link}>
            Crear cuenta nueva
          </Link>
        </View>
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, marginBottom: theme.spacing.lg },
  errorBox: {
    backgroundColor: '#FDECEA',
    color: theme.colors.danger,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
    fontSize: 13,
  },
  links: { marginTop: theme.spacing.lg, gap: 12, alignItems: 'center' },
  link: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
});
