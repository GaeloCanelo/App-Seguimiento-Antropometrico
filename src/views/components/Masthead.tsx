import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { DesignSvg } from './DesignSvg';
import { Gradient, IconAction } from './KidoLogUI';
import { KidoLogIcon } from './KidoLogIcon';

export function Masthead({
  title,
  description,
  brand,
  art,
  onBack,
  actions,
  compact = false,
}: {
  title: string;
  description?: string;
  brand?: boolean;
  art?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.shell}>
      <Gradient colors={theme.colors.mastheadGradient} />
      <View pointerEvents="none" style={styles.orbit}>
        <KidoLogIcon name="hero-circle" size={148} />
      </View>
      <View pointerEvents="none" style={styles.orbitSmall}>
        <KidoLogIcon name="hero-circle-small" size={78} />
      </View>
      {art ? (
        <View pointerEvents="none" style={styles.art}>
          <DesignSvg name="welcome-growth" />
        </View>
      ) : null}
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={[styles.content, compact && styles.compact, art && styles.spacious]}>
          {brand ? (
            <View style={styles.brandRow}>
              {onBack ? <IconAction icon="back" label="Volver" onPress={onBack} onHero /> : null}
              <View style={styles.wordmark}>
                <DesignSvg name="lotus-white" size={24} />
                <Text style={styles.brand}>KidoLog</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.row}>
            {onBack && !brand ? (
              <IconAction icon="back" label="Volver" onPress={onBack} onHero />
            ) : null}
            <View style={styles.copy}>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.85}
                style={[styles.title, compact && styles.compactTitle]}
              >
                {title}
              </Text>
              {description ? (
                <Text maxFontSizeMultiplier={1.85} style={styles.description}>
                  {description}
                </Text>
              ) : null}
            </View>
            {actions ? <View style={styles.actions}>{actions}</View> : null}
          </View>
        </View>
      </SafeAreaView>
      <View pointerEvents="none" style={styles.cap} />
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    shell: { backgroundColor: theme.colors.mastheadGradient[0], overflow: 'hidden' },
    cap: {
      height: 12,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    content: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.compact,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    compact: { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md },
    spacious: { paddingBottom: 56 },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
    copy: { flex: 1, minWidth: 0, gap: 5 },
    actions: { flexDirection: 'row', flexShrink: 0, alignItems: 'center', gap: theme.spacing.xs },
    title: { ...theme.typography.screenTitle, fontSize: 31, color: theme.colors.onHero },
    compactTitle: { fontSize: 23 },
    description: {
      ...theme.typography.bodySmall,
      lineHeight: 19,
      fontSize: 13,
      color: theme.colors.heroTint,
    },
    brandRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.compact,
    },
    wordmark: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    brand: { ...theme.typography.sectionTitle, color: theme.colors.heroAccent },
    orbit: { position: 'absolute', top: -44, right: -30, opacity: 0.55 },
    orbitSmall: { position: 'absolute', right: 38, bottom: -30, opacity: 0.45 },
    art: { position: 'absolute', right: -46, bottom: -30, opacity: 0.34 },
  });
