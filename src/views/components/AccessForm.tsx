import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../viewmodels/AppProvider';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { mensajeEnEspanol, validarCamposAcceso, type AuthErrors } from '../utils/formErrors';
import { AuthFooter, AuthScreen } from './AuthScreen';
import { FormField } from './FormField';
import { Notice, useUI } from './KidoLogUI';
import { PrimaryButton } from './PrimaryButton';

type Flow = 'login' | 'register' | 'recovery';
const screens = {
  login: {
    title: 'Inicia sesión',
    description: 'Accede a tus pacientes y da seguimiento a su crecimiento.',
    button: 'Iniciar sesión',
    error: 'No fue posible iniciar sesión. Intenta de nuevo.',
  },
  register: {
    title: 'Crea tu cuenta',
    description: 'Organiza tus expedientes y consulta indicadores de crecimiento en un solo lugar.',
    button: 'Crear mi cuenta',
    error: 'No fue posible crear la cuenta. Intenta de nuevo.',
  },
  recovery: {
    title: 'Recupera tu contraseña',
    description: 'Escribe el correo asociado a tu cuenta para recibir un enlace de recuperación.',
    button: 'Enviar enlace',
    error: 'No fue posible enviar el enlace. Intenta de nuevo.',
  },
};

export function AccessForm({ flow }: { flow: Flow }) {
  const ui = useUI();
  const styles = useThemedStyles(createStyles);
  const { authManager, hayConexion, establecerMedicoActivo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [hidden, setHidden] = useState(true);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const pending = useRef(false);
  const config = screens[flow];
  const register = flow === 'register';
  const recovery = flow === 'recovery';

  function update(field: keyof AuthErrors, value: string) {
    if (field === 'email') setEmail(value);
    else if (field === 'password') setPassword(value);
    else setConfirmation(value);
    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
      ...(field === 'password' ? { confirmation: undefined } : {}),
    }));
    setProblem(null);
  }

  async function submit() {
    if (!authManager || pending.current) return;
    setProblem(null);
    const issues = validarCamposAcceso({
      email,
      password: recovery ? undefined : password,
      confirmation: register ? confirmation : undefined,
    });
    setErrors(issues);
    if (Object.keys(issues).length) return;
    Keyboard.dismiss();
    pending.current = true;
    setBusy(true);
    try {
      if (recovery) {
        await authManager.recuperarContrasena(email, hayConexion);
        setSent(true);
        return;
      }
      const credentials = { correo: email.trim(), contrasena: password, hayConexion };
      const medico = register
        ? await authManager.crearCuenta({ ...credentials, confirmacion: confirmation })
        : await authManager.iniciarSesion(credentials);
      establecerMedicoActivo(medico);
      router.replace('/(tabs)/pacientes');
    } catch (error) {
      setProblem(mensajeEnEspanol(error, config.error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title={sent ? 'Revisa tu correo' : config.title}
      description={
        sent
          ? 'Si hay una cuenta asociada a ese correo, recibirás un enlace para elegir una nueva contraseña.'
          : config.description
      }
      recovery={recovery}
    >
      {sent ? (
        <>
          <Notice tone="success">
            La solicitud se envió. Si el correo tarda en llegar, revisa también la carpeta de correo
            no deseado.
          </Notice>
          <PrimaryButton
            title="Volver a iniciar sesión"
            onPress={() => router.dismissTo('/(auth)/login')}
          />
          <Pressable
            accessibilityRole="button"
            style={styles.centerLink}
            onPress={() => setSent(false)}
          >
            <Text style={ui.link}>Usar otro correo</Text>
          </Pressable>
        </>
      ) : (
        <>
          {problem ? <Notice tone="error">{problem}</Notice> : null}
          <FormField
            label="Correo electrónico"
            appearance="card"
            value={email}
            onChangeText={(value) => update('email', value)}
            error={errors.email}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            onSubmitEditing={recovery ? () => void submit() : undefined}
            returnKeyType={recovery ? 'go' : 'done'}
          />
          {!recovery ? (
            <FormField
              label="Contraseña"
              appearance="card"
              value={password}
              onChangeText={(value) => update('password', value)}
              error={errors.password}
              hint={register ? 'Usa al menos 8 caracteres.' : undefined}
              secureTextEntry={hidden}
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Crea una contraseña' : 'Escribe tu contraseña'}
              onSubmitEditing={register ? undefined : () => void submit()}
              returnKeyType={register ? 'done' : 'go'}
              suffix={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
                  style={styles.reveal}
                  onPress={() => setHidden((value) => !value)}
                >
                  <Text style={ui.link}>{hidden ? 'Ver' : 'Ocultar'}</Text>
                </Pressable>
              }
            />
          ) : null}
          {register ? (
            <FormField
              label="Confirma tu contraseña"
              appearance="card"
              value={confirmation}
              onChangeText={(value) => update('confirmation', value)}
              error={errors.confirmation}
              secureTextEntry={hidden}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />
          ) : null}
          {flow === 'login' ? (
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable accessibilityRole="link" style={styles.helpLink}>
                <Text style={ui.link}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            </Link>
          ) : null}
          <PrimaryButton
            title={config.button}
            onPress={submit}
            loading={busy}
            disabled={!authManager}
          />
          {recovery ? null : (
            <View style={styles.footer}>
              <AuthFooter signup={register} />
            </View>
          )}
        </>
      )}
    </AuthScreen>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    reveal: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    helpLink: {
      alignSelf: 'flex-end',
      minHeight: 44,
      justifyContent: 'center',
      marginTop: -theme.spacing.sm,
      marginBottom: -theme.spacing.xs,
    },
    centerLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.xs,
    },
  });
