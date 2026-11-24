import { EDAD_MAX_DIAS_OMS, calcularEdadEnDias, validarPacienteDatos } from '../src/domain';
import {
  createThemeStore,
  readThemePreference,
  resolveColorMode,
  THEME_KEY,
} from '../src/views/theme/preferences';
import { indicatorPalette } from '../src/views/theme/indicatorPalette';
import { darkTheme, lightTheme } from '../src/views/theme/tokens';
import {
  birthDateBounds,
  consultationDateBounds,
  datePickerValue,
  isDateWithinBounds,
  isoFromPicker,
} from '../src/views/utils/dateBounds';

describe('apariencia', () => {
  it('respeta las preferencias explícitas y sigue los cambios del dispositivo en Sistema', () => {
    expect(resolveColorMode('light', 'dark')).toBe('light');
    expect(resolveColorMode('dark', 'light')).toBe('dark');
    expect(resolveColorMode('system', 'light')).toBe('light');
    expect(resolveColorMode('system', 'dark')).toBe('dark');
    expect(resolveColorMode('system', null)).toBe('light');
    expect(readThemePreference('unknown')).toBe('system');
  });

  it('mantiene la última selección al reabrir y permite guardar tras un fallo de almacenamiento', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };
    let finishWrite: (() => void) | undefined;
    storage.setItem.mockImplementationOnce(
      (key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            values.set(key, value);
            resolve();
          };
        }),
    );
    const first = createThemeStore(storage);
    const initial = first.save('dark');
    const latest = first.save('light');
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    finishWrite?.();
    await Promise.all([initial, latest]);
    expect(values.get(THEME_KEY)).toBe('light');
    expect(await createThemeStore(storage).load()).toBe('light');

    storage.setItem.mockRejectedValueOnce(new Error('write unavailable'));
    await expect(first.save('dark')).rejects.toThrow('write unavailable');
    await first.save('system');
    expect(await createThemeStore(storage).load()).toBe('system');
  });

  it('tiene contraste suficiente para texto y acciones en ambas paletas', () => {
    function luminance(hex: string) {
      const channels =
        hex
          .slice(1)
          .match(/../g)
          ?.map((value) => parseInt(value, 16) / 255) ?? [];
      const [r, g, b] = channels.map((x) =>
        x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    const contrast = (a: string, b: string) => {
      const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
      return (high + 0.05) / (low + 0.05);
    };
    for (const tones of Object.values(indicatorPalette)) {
      for (const { surface, ink, onInk } of Object.values(tones)) {
        expect(contrast(ink, surface)).toBeGreaterThan(4.5);
        expect(contrast(onInk, ink)).toBeGreaterThan(4.5);
      }
    }
    for (const { colors } of [lightTheme, darkTheme]) {
      expect(contrast(colors.text, colors.background)).toBeGreaterThan(4.5);
      expect(contrast(colors.textMuted, colors.surface)).toBeGreaterThan(4.5);
      expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThan(4.5);
      expect(contrast(colors.onDanger, colors.dangerFill)).toBeGreaterThan(4.5);
      expect(contrast(colors.primaryInk, colors.primaryLight)).toBeGreaterThan(4.5);
      expect(contrast(colors.onIndigoAction, colors.indigoAction)).toBeGreaterThan(4.5);
      expect(contrast(colors.indigoInk, colors.indigoSurface)).toBeGreaterThan(4.5);
      expect(contrast(colors.blueInk, colors.blueSurface)).toBeGreaterThan(4.5);
      expect(contrast(colors.peachInk, colors.peachSurface)).toBeGreaterThan(4.5);
      for (const stop of colors.mastheadGradient) {
        expect(contrast(colors.onHero, stop)).toBeGreaterThan(4.5);
        expect(contrast(colors.heroTint, stop)).toBeGreaterThan(4.5);
      }
    }
  });
});

describe('selector de fechas clínicas', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');

  it('incluye los dos límites válidos para nacimiento y excluye fechas imposibles o futuras', () => {
    const bounds = birthDateBounds(now);
    expect(bounds.maximum).toBe('2026-11-22');
    expect(calcularEdadEnDias(bounds.minimum, bounds.maximum)).toBe(EDAD_MAX_DIAS_OMS);
    const validationInput = {
      folio_clinico: 'TEST',
      nombre: 'Paciente de prueba',
      fecha_hoy: bounds.maximum,
    };
    expect(validarPacienteDatos({ ...validationInput, fecha_nacimiento: bounds.minimum })).toEqual(
      [],
    );
    expect(isDateWithinBounds(bounds.minimum, bounds)).toBe(true);
    expect(isDateWithinBounds(bounds.maximum, bounds)).toBe(true);
    expect(isDateWithinBounds('2026-11-23', bounds)).toBe(false);
    expect(isDateWithinBounds('2026-02-29', bounds)).toBe(false);
    expect(isDateWithinBounds('2019-11-22', bounds)).toBe(false);
  });

  it('restringe una consulta a la vida del paciente y mantiene el día ISO al confirmar', () => {
    const birth = '2020-02-29';
    const bounds = consultationDateBounds(birth, now);
    if (!bounds) throw new Error('Se esperaban límites válidos');
    expect(bounds.minimum).toBe(birth);
    expect(calcularEdadEnDias(birth, bounds.maximum)).toBe(EDAD_MAX_DIAS_OMS);
    expect(isDateWithinBounds('2020-02-28', bounds)).toBe(false);
    expect(isDateWithinBounds('2026-11-22', bounds)).toBe(false);
    expect(consultationDateBounds('2026-11-23', now)).toBeNull();
    expect(isoFromPicker(datePickerValue(birth))).toBe(birth);
  });
});
