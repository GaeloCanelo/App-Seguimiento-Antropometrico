import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import {
  constrainChart,
  initialTransform,
  MAX_ZOOM,
  MIN_ZOOM,
  scaleChart,
  type ChartTransform,
} from '../utils/graphZoom';
import { GrowthCurveSvg } from './GrowthCurveSvg';

type Props = Parameters<typeof GrowthCurveSvg>[0];
type Pinch = { distance: number; x: number; y: number };

function readPinch(event: GestureResponderEvent): Pinch | null {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) return null;
  const distance = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
  return distance > 0 ? { distance, x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 } : null;
}

export function ZoomableGrowthCurve(props: Props) {
  const styles = useThemedStyles(createStyles);
  const size = useRef({ width: 0, height: 0 });
  const current = useRef(initialTransform);
  const [reportedScale, setReportedScale] = useState(MIN_ZOOM);
  const [values] = useState(() => ({
    scale: new Animated.Value(MIN_ZOOM),
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }));
  const gesture = useRef({ start: initialTransform, pinch: null as Pinch | null, dx: 0, dy: 0 });

  const apply = useMemo(
    () => (next: ChartTransform) => {
      current.current = constrainChart(next, size.current);
      values.x.setValue(current.current.x);
      values.y.setValue(current.current.y);
      values.scale.setValue(current.current.scale);
    },
    [values],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length > 1,
        onMoveShouldSetPanResponderCapture: (event, state) =>
          event.nativeEvent.touches.length > 1 ||
          (current.current.scale > MIN_ZOOM && Math.hypot(state.dx, state.dy) > 7),
        onPanResponderGrant: (event, state) => {
          gesture.current = {
            start: current.current,
            pinch: readPinch(event),
            dx: state.dx,
            dy: state.dy,
          };
        },
        onPanResponderMove: (event, state) => {
          const now = readPinch(event);
          const { pinch, start, dx, dy } = gesture.current;
          if (now && pinch) {
            apply(
              scaleChart(start, (start.scale * now.distance) / pinch.distance, size.current, {
                x: now.x - pinch.x,
                y: now.y - pinch.y,
              }),
            );
          } else if (Boolean(now) !== Boolean(pinch)) {
            gesture.current = { start: current.current, pinch: now, dx: state.dx, dy: state.dy };
          } else if (!now && start.scale > MIN_ZOOM) {
            apply({ scale: start.scale, x: start.x + state.dx - dx, y: start.y + state.dy - dy });
          }
        },
        onPanResponderRelease: () => setReportedScale(current.current.scale),
        onPanResponderTerminate: () => setReportedScale(current.current.scale),
      }),
    [apply],
  );

  const zoom = (scale: number) => {
    apply(scaleChart(current.current, scale, size.current));
    setReportedScale(current.current.scale);
  };

  return (
    <View style={styles.widget}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Ampliación</Text>
        <View style={styles.controls}>
          <ZoomButton
            label="Reducir gráfica"
            text="−"
            disabled={reportedScale <= MIN_ZOOM}
            onPress={() => zoom(reportedScale - 0.5)}
          />
          <Text
            accessibilityLabel={`Ampliación al ${Math.round(reportedScale * 100)} por ciento`}
            style={styles.level}
          >
            {Math.round(reportedScale * 100)} %
          </Text>
          <ZoomButton
            label="Ampliar gráfica"
            text="+"
            disabled={reportedScale >= MAX_ZOOM}
            onPress={() => zoom(reportedScale + 0.5)}
          />
          <ZoomButton
            label="Restablecer ampliación"
            text="Restablecer"
            disabled={reportedScale <= MIN_ZOOM}
            onPress={() => zoom(MIN_ZOOM)}
          />
        </View>
      </View>
      <View
        {...responder.panHandlers}
        style={[styles.viewport, { aspectRatio: props.geometria.ancho / props.geometria.alto }]}
        onLayout={(event) => {
          size.current = event.nativeEvent.layout;
          apply(current.current);
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: values.x },
                { translateY: values.y },
                { scale: values.scale },
              ],
            },
          ]}
        >
          <GrowthCurveSvg {...props} />
        </Animated.View>
      </View>
      <Text style={styles.hint}>
        {reportedScale > MIN_ZOOM
          ? 'Arrastra la gráfica para recorrerla.'
          : 'Pellizca la gráfica o usa los botones para ampliarla.'}
      </Text>
    </View>
  );
}

function ZoomButton({
  text,
  label,
  onPress,
  disabled,
}: {
  text: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    widget: { gap: theme.spacing.sm },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    title: { ...theme.typography.label, color: theme.colors.text, flexGrow: 1 },
    controls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    level: {
      color: theme.colors.textMuted,
      ...theme.typography.caption,
      textAlign: 'center',
      minWidth: 40,
    },
    button: {
      minWidth: 44,
      minHeight: 44,
      paddingHorizontal: 6,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    buttonText: { ...theme.typography.label, color: theme.colors.primaryInk },
    pressed: { opacity: 0.65 },
    disabled: { opacity: 0.44 },
    viewport: {
      width: '100%',
      overflow: 'hidden',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
    hint: { color: theme.colors.textMuted, ...theme.typography.caption },
  });
