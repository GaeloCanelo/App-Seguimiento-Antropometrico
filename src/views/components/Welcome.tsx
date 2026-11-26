import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { AuthFooter } from './AuthScreen';
import { DesignSvg, type DesignAsset } from './DesignSvg';
import { FormScroll, ScreenFrame, useUI } from './KidoLogUI';
import { Masthead } from './Masthead';
import { PrimaryButton } from './PrimaryButton';
import { SoftAppear } from './SoftAppear';

export function Welcome() {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();

  return (
    <ScreenFrame
      bottom
      masthead={
        <Masthead
          brand
          art
          title="Seguimiento de crecimiento infantil"
          description="Expedientes, consultas y curvas OMS"
        />
      }
    >
      <FormScroll style={styles.content}>
        <SoftAppear>
          <View style={styles.panel}>
            <Text style={ui.section}>Tu espacio de trabajo clínico</Text>
            <Text style={styles.description}>
              Registra mediciones, consulta las curvas OMS y comparte reportes desde el expediente.
            </Text>
            <PrimaryButton title="Iniciar sesión" onPress={() => router.push('/(auth)/login')} />
            <AuthFooter />
          </View>
        </SoftAppear>
        <View style={styles.tools}>
          <Feature icon="calendar" title="Consultas" text="Peso, talla y perímetro cefálico." />
          <Feature icon="chart" title="Curvas OMS" text="Evolución por edad y sexo." />
        </View>
      </FormScroll>
    </ScreenFrame>
  );
}

function Feature({ icon, title, text }: { icon: DesignAsset; title: string; text: string }) {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  return (
    <View style={styles.feature}>
      <View style={[styles.icon, icon === 'calendar' ? styles.indigoTile : styles.blueTile]}>
        <DesignSvg name={icon} size={20} />
      </View>
      <Text style={ui.title}>{title}</Text>
      <Text style={ui.muted}>{text}</Text>
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    content: { maxWidth: 520, paddingTop: theme.spacing.compact },
    panel: {
      borderRadius: theme.radius.navigation,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.page,
      gap: theme.spacing.md,
      ...theme.shadow.card,
    },
    description: {
      ...theme.typography.bodySmall,
      lineHeight: 20,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    tools: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.compact },
    feature: {
      flex: 1,
      flexBasis: 122,
      padding: theme.spacing.compact,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.cardBorder,
      borderWidth: 1,
      borderRadius: theme.radius.card,
      gap: 5,
    },
    indigoTile: { backgroundColor: theme.colors.indigoSurface },
    blueTile: { backgroundColor: theme.colors.blueSurface },
    icon: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
    },
  });
