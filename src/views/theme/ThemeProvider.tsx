import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Appearance,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { darkTheme, lightTheme, type KidoLogTheme } from './tokens';
import {
  createThemeStore,
  resolveColorMode,
  type ColorMode,
  type ThemePreference,
} from './preferences';

interface AppearanceValue {
  theme: KidoLogTheme;
  mode: ColorMode;
  preference: ThemePreference;
  ready: boolean;
  reduceMotion: boolean;
  storageError: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const themeStore = createThemeStore(AsyncStorage);
const AppearanceContext = createContext<AppearanceValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setMode] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const updateId = useRef(0);
  const mode = resolveColorMode(preference, system);
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    let alive = true;
    void themeStore
      .load()
      .then(
        (saved) => {
          if (alive) setMode(saved);
        },
        () => {
          if (alive) setStorageError(true);
        },
      )
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let didChange = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      didChange = true;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (alive && !didChange) setReduceMotion(enabled);
      },
      () => {},
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (ready && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
    }
  }, [preference, ready]);

  useEffect(
    () => () => {
      if (Platform.OS === 'ios' || Platform.OS === 'android') Appearance.setColorScheme('auto');
    },
    [],
  );

  const setPreference = useCallback((next: ThemePreference) => {
    setMode(next);
    const id = ++updateId.current;
    void themeStore.save(next).then(
      () => {
        if (id === updateId.current) setStorageError(false);
      },
      () => {
        if (id === updateId.current) setStorageError(true);
      },
    );
  }, []);

  const value = useMemo(
    () => ({ theme, mode, preference, ready, reduceMotion, storageError, setPreference }),
    [theme, mode, preference, ready, reduceMotion, storageError, setPreference],
  );
  return (
    <AppearanceContext.Provider value={value}>
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        {children}
        <ThemeTransition color={theme.colors.background} reduceMotion={reduceMotion} />
      </View>
    </AppearanceContext.Provider>
  );
}

function ThemeTransition({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const previous = useRef(color);
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const changed = previous.current !== color;
    previous.current = color;
    if (!changed || reduceMotion) {
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0.16);
    const fade = Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true });
    fade.start();
    return () => fade.stop();
  }, [color, opacity, reduceMotion]);
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { opacity, backgroundColor: color }]}
    />
  );
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('KidoLog necesita un proveedor de apariencia.');
  return appearance;
}

export function useTheme() {
  return useAppearance().theme;
}

export function useThemedStyles<T>(createStyles: (theme: KidoLogTheme) => T): T {
  const theme = useTheme();
  return useMemo(() => createStyles(theme), [createStyles, theme]);
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
