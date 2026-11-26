import type { ReactNode } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { useKeyboardVisible } from '../utils/useKeyboardVisible';
import { Masthead } from './Masthead';
import { FormScroll, ScreenFrame, useUI } from './KidoLogUI';

export function AuthScreen({
  title,
  description,
  children,
  recovery = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  recovery?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const typing = useKeyboardVisible();
  const volver = () => {
    if (recovery) router.dismissTo('/(auth)/login');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <ScreenFrame
      bottom
      masthead={
        <Masthead
          title={title}
          description={typing ? undefined : description}
          brand={!typing}
          art={!typing}
          compact={typing}
          onBack={volver}
        />
      }
    >
      <FormScroll style={styles.scroll}>
        <View style={styles.card}>{children}</View>
      </FormScroll>
    </ScreenFrame>
  );
}

export function AuthFooter({ signup = false }: { signup?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  return (
    <View style={styles.footer}>
      <Text style={ui.muted}>{signup ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}</Text>
      <Link href={signup ? '/(auth)/login' : '/(auth)/register'} asChild>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
        >
          <Text style={ui.link}>{signup ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    scroll: { paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xl, maxWidth: 500 },
    card: {
      alignSelf: 'center',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: 440,
      padding: theme.spacing.page,
      borderRadius: theme.radius.navigation,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.cardBorder,
      borderWidth: 1,
      gap: theme.spacing.md,
      ...theme.shadow.card,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      columnGap: theme.spacing.sm,
    },
    footerLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 3 },
    pressed: { opacity: 0.66 },
  });
