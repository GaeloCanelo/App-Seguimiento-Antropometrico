import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CambiosPendientesError } from '../../data';
import { useApp } from '../../viewmodels/AppProvider';
import { useDialog } from '../../views/components/DialogProvider';
import { SoftAppear } from '../../views/components/SoftAppear';
import { DesignSvg, type DesignAsset } from '../../views/components/DesignSvg';
import { KidoLogIcon } from '../../views/components/KidoLogIcon';
import { FormField } from '../../views/components/FormField';
import { KidoLogCard } from '../../views/components/KidoLogCard';
import { Choices, FormScroll, GradientCard, Notice, useUI } from '../../views/components/KidoLogUI';
import { Masthead } from '../../views/components/Masthead';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { SyncStatusBadge } from '../../views/components/SyncStatusBadge';
import { useAppearance, useThemedStyles } from '../../views/theme/ThemeProvider';
import { mensajeEnEspanol } from '../../views/utils/formErrors';
import type { KidoLogTheme } from '../../views/theme/tokens';

const appearances = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
] as const;

type Section = 'profile' | 'password' | 'sync' | 'delete';

export default function CuentaScreen() {
  const { medico } = useApp();
  return medico ? <AccountSettings key={medico.uid_medico} /> : null;
}

function AccountSettings() {
  const dialog = useDialog();
  const { mode, preference, setPreference, storageError } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const {
    medico,
    authManager,
    hayConexion,
    establecerMedicoActivo,
    sincronizando,
    pendientesSync,
    ultimoErrorSync,
    sincronizarAhora,
  } = useApp();
  const [section, setSection] = useState<Section | null>(null);
  const [nombre, setNombre] = useState(medico?.nombre ?? '');
  const [apellidos, setApellidos] = useState(medico?.apellidos ?? '');
  const [correo, setCorreo] = useState(medico?.correo ?? '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!medico) return null;
  const owner = medico.uid_medico;
  const fullName = [medico.nombre, medico.apellidos].filter(Boolean).join(' ');
  const changedEmail = correo.trim() !== medico.correo;
  const badge = (
    <SyncStatusBadge
      pill
      hayConexion={hayConexion}
      sincronizando={sincronizando}
      pendientes={pendientesSync}
      ultimoError={ultimoErrorSync}
    />
  );

  const open = (next: Section | null) => {
    if (busy.current) return;
    setSection(next);
    setNombre(medico.nombre ?? '');
    setApellidos(medico.apellidos ?? '');
    setCorreo(medico.correo);
    clearSecrets();
    setError(null);
    setMessage(null);
  };

  function clearSecrets() {
    setPassword('');
    setNewPassword('');
    setConfirmation('');
  }

  const run = async (action: () => Promise<void>, onFailure?: (error: unknown) => boolean) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await action();
    } catch (reason) {
      if (!onFailure?.(reason)) {
        setError(mensajeEnEspanol(reason, 'No se pudo completar la acción. Intenta de nuevo.'));
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const leave = () => {
    establecerMedicoActivo(null);
    router.replace('/(auth)/login');
  };

  const guardarPerfil = () => {
    if (!authManager) return;
    void run(async () => {
      if (changedEmail && !correo.trim()) throw new Error('El correo electrónico es obligatorio.');
      if (changedEmail && !password)
        throw new Error('Confirma tu contraseña para actualizar el correo.');
      const profile = await authManager.actualizarDatosCuenta({
        uid_medico: owner,
        nombre: nombre.trim() || null,
        apellidos: apellidos.trim() || null,
        correo: changedEmail ? correo.trim() : undefined,
        contrasenaActual: changedEmail ? password : undefined,
        hayConexion,
      });
      establecerMedicoActivo(profile);
      setSection(null);
      clearSecrets();
      setMessage('Los datos del perfil se guardaron.');
    });
  };

  const changePassword = () => {
    if (!authManager) return;
    void run(async () => {
      if (!password) throw new Error('Escribe tu contraseña actual.');
      await authManager.cambiarContrasena({
        contrasenaActual: password,
        nuevaContrasena: newPassword,
        confirmacion: confirmation,
        hayConexion,
      });
      setSection(null);
      clearSecrets();
      setMessage('La contraseña se actualizó.');
    });
  };

  const logout = () => {
    if (!authManager) return;
    dialog('Cerrar sesión', 'Se limpiarán los datos locales de este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          void run(
            async () => {
              await authManager.cerrarSesion(owner);
              leave();
            },
            (reason) => {
              if (!(reason instanceof CambiosPendientesError)) return false;
              dialog('Cambios pendientes sin sincronizar', reason.message, [
                { text: 'Esperar', style: 'cancel' },
                {
                  text: 'Salir y descartar pendientes',
                  style: 'destructive',
                  onPress: () => {
                    void run(async () => {
                      await authManager.cerrarSesion(owner, true);
                      leave();
                    });
                  },
                },
              ]);
              return true;
            },
          );
        },
      },
    ]);
  };

  const removeAccount = () => {
    if (!authManager || !password) return;
    dialog(
      'Eliminar cuenta',
      'La cuenta y sus datos locales y remotos se eliminarán de forma definitiva.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            void run(async () => {
              await authManager.eliminarCuenta({
                uid_medico: owner,
                contrasena: password,
                hayConexion,
              });
              leave();
            });
          },
        },
      ],
    );
  };

  const disabled = saving || !authManager;

  return (
    <FormScroll
      key={section ?? 'settings'}
      masthead={
        <Masthead
          title="Configuración"
          onBack={() => (section ? open(null) : router.navigate('/(tabs)/pacientes'))}
          compact
        />
      }
    >
      <GradientCard style={styles.profile}>
        <View style={ui.row}>
          <View style={styles.avatar}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <DesignSvg name="settings-avatar" />
            </View>
            <Text style={styles.initial}>
              {Array.from(fullName || medico.correo)[0]?.toLocaleUpperCase('es-MX')}
            </Text>
          </View>
          <View style={ui.grow}>
            <Text style={ui.section}>{fullName || 'Cuenta médica'}</Text>
            <Text style={ui.muted}>{medico.correo}</Text>
          </View>
        </View>
        {badge}
      </GradientCard>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      {section === 'profile' ? (
        <KidoLogCard style={styles.card}>
          <Text style={ui.section}>Editar perfil</Text>
          <FormField
            label="Nombre(s)"
            value={nombre}
            onChangeText={setNombre}
            autoComplete="given-name"
          />
          <FormField
            label="Apellidos"
            value={apellidos}
            onChangeText={setApellidos}
            autoComplete="family-name"
          />
          <FormField
            label="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {changedEmail ? (
            <FormField
              label="Contraseña actual"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
          ) : null}
          <PrimaryButton
            title="Guardar perfil"
            loading={saving}
            disabled={disabled}
            onPress={guardarPerfil}
          />
        </KidoLogCard>
      ) : null}

      {section === 'password' ? (
        <KidoLogCard style={styles.card}>
          <Text style={ui.section}>Cambiar contraseña</Text>
          <FormField
            label="Contraseña actual"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <FormField
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <FormField
            label="Confirmar nueva contraseña"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
          />
          <PrimaryButton
            title="Actualizar contraseña"
            loading={saving}
            disabled={disabled}
            onPress={changePassword}
          />
        </KidoLogCard>
      ) : null}

      {section === 'sync' ? (
        <KidoLogCard style={styles.card}>
          <Text style={ui.section}>Sincronización</Text>
          {badge}
          {ultimoErrorSync ? <Notice tone="error">{ultimoErrorSync}</Notice> : null}
          <Text style={ui.muted}>Cambios pendientes: {pendientesSync}</Text>
          <PrimaryButton
            title="Sincronizar ahora"
            onPress={() => {
              void sincronizarAhora();
            }}
            loading={sincronizando}
            disabled={!hayConexion}
          />
        </KidoLogCard>
      ) : null}

      {section === 'delete' ? (
        <KidoLogCard style={styles.card}>
          <Text style={ui.section}>Eliminar cuenta</Text>
          <Notice tone="error">
            Esta acción elimina tu cuenta y sus datos del dispositivo y de la nube.
          </Notice>
          <FormField
            label="Contraseña actual"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          <PrimaryButton
            title="Revisar eliminación"
            variant="danger"
            loading={saving}
            disabled={disabled || !password || !hayConexion || sincronizando}
            onPress={removeAccount}
          />
          {!hayConexion ? (
            <Text style={ui.muted}>Conéctate a internet para eliminar la cuenta.</Text>
          ) : null}
        </KidoLogCard>
      ) : null}

      {!section ? (
        <SoftAppear>
          <View style={styles.settingsSections}>
            <View style={styles.group}>
              <Text accessibilityRole="header" style={ui.section}>
                Apariencia
              </Text>
              <KidoLogCard style={styles.appearance}>
                <View style={ui.row}>
                  <View style={styles.iconTile}>
                    <DesignSvg name="moon" size={20} />
                  </View>
                  <View style={ui.grow}>
                    <Text style={ui.title}>Tema de la aplicación</Text>
                    <Text style={ui.muted}>
                      {preference === 'system'
                        ? `Apariencia del dispositivo · ${mode === 'dark' ? 'Oscuro' : 'Claro'}`
                        : 'Se aplica a todas las pantallas'}
                    </Text>
                  </View>
                </View>
                <Choices options={appearances} value={preference} onChange={setPreference} />
                {storageError ? (
                  <Notice tone="error">No se pudo guardar la preferencia de apariencia.</Notice>
                ) : null}
              </KidoLogCard>
            </View>
            <View style={styles.group}>
              <Text accessibilityRole="header" style={ui.section}>
                Cuenta
              </Text>
              <KidoLogCard style={styles.settingsCard}>
                <SettingRow label="Editar perfil" icon="edit" onPress={() => open('profile')} />
                <SettingRow
                  label="Cambiar contraseña"
                  icon="lock"
                  onPress={() => open('password')}
                />
              </KidoLogCard>
            </View>
            <View style={styles.group}>
              <Text accessibilityRole="header" style={ui.section}>
                Datos y sincronización
              </Text>
              <KidoLogCard style={styles.settingsCard}>
                <SettingRow
                  label="Sincronización"
                  detail={hayConexion ? `${pendientesSync} cambios pendientes` : 'Sin conexión'}
                  onPress={() => open('sync')}
                />
              </KidoLogCard>
            </View>
            <View style={styles.group}>
              <Text accessibilityRole="header" style={ui.section}>
                Sesión
              </Text>
              <KidoLogCard style={styles.settingsCard}>
                <SettingRow
                  label="Cerrar sesión"
                  icon="logout"
                  disabled={disabled || sincronizando}
                  onPress={logout}
                />
                <SettingRow
                  label="Eliminar cuenta"
                  icon="trash"
                  danger
                  onPress={() => open('delete')}
                />
              </KidoLogCard>
            </View>
          </View>
        </SoftAppear>
      ) : null}
    </FormScroll>
  );
}

function SettingRow({
  label,
  icon,
  detail,
  onPress,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon?: DesignAsset;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.setting, (pressed || disabled) && styles.dimmed]}
    >
      <View style={styles.iconTile}>
        {icon ? <DesignSvg name={icon} size={20} /> : <KidoLogIcon name="cloud" size={20} />}
      </View>
      <View style={ui.grow}>
        <Text style={[ui.title, danger && styles.danger]}>{label}</Text>
        {detail ? <Text style={ui.muted}>{detail}</Text> : null}
      </View>
      <DesignSvg name="record-chevron" />
    </Pressable>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    initial: { ...theme.typography.avatar, color: theme.colors.onHero },
    profile: { padding: theme.spacing.md, gap: theme.spacing.compact },
    settingsSections: { gap: theme.spacing.lg },
    group: { gap: theme.spacing.sm },
    appearance: { padding: theme.spacing.md, gap: theme.spacing.md },
    settingsCard: { padding: theme.spacing.xs, gap: theme.spacing.xs },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: { gap: theme.spacing.sm },
    setting: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.compact,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      minHeight: 52,
      padding: theme.spacing.sm,
    },
    dimmed: { opacity: 0.6 },
    danger: { color: theme.colors.danger },
  });
