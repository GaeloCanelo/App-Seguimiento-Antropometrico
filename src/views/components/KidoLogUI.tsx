import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { DesignSvg, type DesignAsset } from './DesignSvg';
import { mensajeEnEspanol } from '../utils/formErrors';
import { SoftAppear } from './SoftAppear';
import { TransientNotice } from './TransientNotice';

const createUI = (theme: KidoLogTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.page,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
    },
    heading: { color: theme.colors.text, ...theme.typography.screenTitle },
    section: { color: theme.colors.text, ...theme.typography.sectionTitle },
    title: { color: theme.colors.text, ...theme.typography.cardTitle },
    muted: { color: theme.colors.textMuted, ...theme.typography.bodySmall },
    link: { color: theme.colors.primaryInk, ...theme.typography.label, fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.compact },
    between: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    grow: { flex: 1 },
  });

export function useUI() {
  return useThemedStyles(createUI);
}

export function Gradient({ colors }: { colors?: readonly string[] }) {
  const theme = useTheme();
  const stops = colors ?? theme.colors.softGradient;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="kidologSurface" x1="0%" y1="0%" x2="100%" y2="65%">
            {stops.map((color, index) => (
              <Stop key={color} offset={index / (stops.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#kidologSurface)" />
      </Svg>
    </View>
  );
}

export function GradientCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.gradientCard, style]}>
      <Gradient />
      {children}
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
  outlined = false,
}: {
  children: string;
  tone?: 'info' | 'error' | 'success';
  outlined?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <SoftAppear>
      <View
        style={[
          styles.notice,
          outlined && styles.outlined,
          tone === 'error' && styles.error,
          tone === 'success' && styles.success,
        ]}
      >
        {tone === 'info' ? <DesignSvg name="info" size={20} /> : null}
        <Text
          accessibilityRole={tone === 'error' ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={[
            styles.noticeText,
            tone === 'error' && styles.errorText,
            tone === 'success' && styles.successText,
          ]}
        >
          {tone === 'error'
            ? mensajeEnEspanol(
                { message: children },
                'No se pudo completar la acción. Intenta de nuevo.',
              )
            : children}
        </Text>
      </View>
    </SoftAppear>
  );
}

export function IconAction({
  icon,
  label,
  onPress,
  onHero = false,
}: {
  icon: DesignAsset;
  label: string;
  onPress: () => void;
  onHero?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        onHero && styles.heroAction,
        pressed && styles.pressed,
      ]}
    >
      <DesignSvg name={icon} size={21} tint={onHero ? theme.colors.onHero : undefined} />
    </Pressable>
  );
}

export function FormScroll({
  children,
  style,
  masthead,
  info,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  masthead?: ReactNode;
  info?: string;
}) {
  const ui = useUI();
  const scroll = (
    <KeyboardAvoidingView
      style={ui.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustsScrollIndicatorInsets={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[ui.content, style]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
  const content = info ? (
    <View style={ui.screen}>
      {scroll}
      <TransientNotice key={info} message={info} />
    </View>
  ) : (
    scroll
  );
  return masthead ? <ScreenFrame masthead={masthead}>{content}</ScreenFrame> : content;
}

export function ScreenFrame({
  children,
  bottom = false,
  masthead,
}: {
  children: ReactNode;
  bottom?: boolean;
  masthead?: ReactNode;
}) {
  const ui = useUI();
  const edges = {
    top: masthead ? 'off' : 'additive',
    left: 'additive',
    right: 'additive',
    bottom: bottom ? 'additive' : 'off',
  } as const;
  return (
    <View style={ui.screen}>
      {masthead}
      <SafeAreaView edges={edges} style={ui.screen}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function ScreenFeedback({
  loading,
  error,
  empty,
}: {
  loading?: boolean;
  error?: string | null;
  empty: string;
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const ui = useUI();
  if (loading)
    return (
      <ActivityIndicator
        accessibilityLabel="Cargando"
        color={theme.colors.primaryInk}
        style={styles.feedback}
      />
    );
  if (error) return <Notice tone="error">{error}</Notice>;
  return <Text style={[ui.muted, styles.feedback]}>{empty}</Text>;
}

export function Choices<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{
    value: T;
    label: string;
    color?: string;
    surface?: string;
    selectedColor?: string;
  }>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  return (
    <View style={styles.choicesGroup}>
      {label ? <Text style={ui.title}>{label}</Text> : null}
      <View style={styles.choices} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          const color = selected ? option.selectedColor : option.color;
          const backgroundColor = option.surface
            ? selected
              ? option.color
              : option.surface
            : undefined;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[
                styles.choice,
                selected && styles.selected,
                backgroundColor ? { backgroundColor } : null,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.selectedText,
                  color ? { color } : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    gradientCard: {
      overflow: 'hidden',
      borderRadius: theme.radius.navigation,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primaryLight,
      gap: theme.spacing.xs,
    },
    notice: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.compact,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primaryLight,
      minHeight: 48,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    noticeText: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.primaryInk },
    error: { backgroundColor: theme.colors.dangerLight },
    errorText: { color: theme.colors.danger },
    success: { backgroundColor: theme.colors.successLight },
    successText: { color: theme.colors.successInk },
    iconAction: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    heroAction: {
      backgroundColor: theme.colors.mastheadWash,
      borderColor: theme.colors.mastheadBorder,
    },
    pressed: { opacity: 0.65 },
    feedback: { textAlign: 'center', marginVertical: theme.spacing.md },
    choicesGroup: { gap: theme.spacing.xs },
    choices: { flexDirection: 'row', gap: theme.spacing.sm },
    choice: {
      flex: 1,
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.radius.pill,
      padding: theme.spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selected: { backgroundColor: theme.colors.primary },
    choiceText: { color: theme.colors.primaryInk, ...theme.typography.label, textAlign: 'center' },
    selectedText: { color: theme.colors.onPrimary },
  });
