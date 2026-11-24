export const THEME_KEY = 'kidolog.theme.mode';
export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorMode = Exclude<ThemePreference, 'system'>;

export function readThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveColorMode(
  preference: ThemePreference,
  system: ColorMode | null | undefined,
): ColorMode {
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
}

interface ThemeStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

export function createThemeStore(storage: ThemeStorage) {
  let queue = Promise.resolve();
  return {
    async load() {
      await queue;
      return readThemePreference(await storage.getItem(THEME_KEY));
    },
    save(preference: ThemePreference) {
      const write = queue.then(() => storage.setItem(THEME_KEY, preference));
      queue = write.catch(() => {});
      return write;
    },
  };
}
