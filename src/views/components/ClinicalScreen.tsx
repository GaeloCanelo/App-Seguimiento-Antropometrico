import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useApp } from '../../viewmodels/AppProvider';
import { KidoLogTabBar } from './KidoLogTabBar';
import { FormScroll, ScreenFeedback, ScreenFrame } from './KidoLogUI';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { Masthead } from './Masthead';

export function ClinicalScreen({
  title,
  description,
  action,
  footer,
  info,
  children,
  onBack,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  footer?: ReactNode;
  info?: string;
  children: ReactNode;
  onBack?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { medico, listo, errorInicializacion } = useApp();
  const volver =
    onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/pacientes')));
  const header = (
    <Masthead title={title} description={description} onBack={volver} actions={action} compact />
  );

  if (!listo || errorInicializacion)
    return (
      <ScreenFrame masthead={header} bottom>
        <ScreenFeedback loading={!listo} error={errorInicializacion} empty="" />
      </ScreenFrame>
    );
  if (!medico) return <Redirect href="/" />;

  return (
    <>
      <FormScroll masthead={header} info={info}>
        {children}
      </FormScroll>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
      <KidoLogTabBar active="pacientes" onSelect={(tab) => router.navigate(tab.href)} />
    </>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    footer: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });
