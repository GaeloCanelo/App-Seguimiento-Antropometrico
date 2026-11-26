export const lightTheme = {
  colors: {
    primary: '#7452BB',
    brand: '#8D69D6',
    primaryLight: '#F0EAFB',
    primaryInk: '#60419F',
    primaryPill: '#EDE3FB',
    accent: '#00796B',
    background: '#FAF8FF',
    surface: '#FFFFFF',
    border: '#E7E3F0',
    formBorder: '#8D829F',
    inputBorder: '#EAE3F3',
    cardBorder: '#EEE7F4',
    text: '#241D36',
    textMuted: '#6B647C',
    onPrimary: '#FFFFFF',
    onHero: '#FFFFFF',
    dangerFill: '#C62828',
    onDanger: '#FFFFFF',
    backdrop: 'rgba(29, 21, 45, 0.5)',
    heroTint: '#E7DAFF',
    mastheadGradient: ['#201A44', '#483086', '#6344A2'],
    mastheadWash: 'rgba(255, 255, 255, 0.13)',
    mastheadBorder: 'rgba(255, 255, 255, 0.27)',
    heroAccent: '#DCD2FF',
    indigoSurface: '#ECEAFF',
    indigoInk: '#3D3B95',
    indigoAction: '#5041AA',
    onIndigoAction: '#FFFFFF',
    blueSurface: '#E5F0FD',
    blueInk: '#214E82',
    peachSurface: '#FCEBD9',
    peachInk: '#78451F',
    dangerLight: '#FDECEA',
    softGradient: ['#F3ECFE', '#E6DAFB', '#D2C1F3'],
    authGradient: ['#FAF8FF', '#F0E8FA', '#DFCEF8'],
    heroGradient: ['#54378D', '#805FC7', '#B998EE'],
    success: '#2E7D32',
    successInk: '#237862',
    successLight: '#E8F7EF',
    warning: '#9B4C08',
    amber: '#F9A825',
    danger: '#C62828',
    info: '#1565C0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    compact: 12,
    md: 16,
    page: 20,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    input: 17,
    card: 20,
    navigation: 23,
    hero: 28,
    pill: 999,
  },
  typography: {
    caption: { fontSize: 11, fontFamily: 'Inter_400Regular' },
    bodySmall: { fontSize: 12, fontFamily: 'Inter_400Regular' },
    cardTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
    sectionTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
    screenTitle: { fontSize: 25, fontFamily: 'PlusJakartaSans_700Bold' },
    heroTitle: { fontSize: 25, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 30 },
    avatar: { fontSize: 21, fontFamily: 'PlusJakartaSans_700Bold' },
    button: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    label: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  },
  shadow: {
    card: {
      shadowColor: '#472B6E',
      shadowOpacity: 0.09,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 7,
      elevation: 2,
    },
  },
} as const;

type Palette = {
  readonly [
    Key in keyof typeof lightTheme.colors
  ]: (typeof lightTheme.colors)[Key] extends readonly string[] ? readonly string[] : string;
};

export type KidoLogTheme = Omit<typeof lightTheme, 'colors' | 'shadow'> & {
  colors: Palette;
  shadow: {
    card: {
      shadowColor: string;
      shadowOpacity: number;
      shadowOffset: { width: number; height: number };
      shadowRadius: number;
      elevation: number;
    };
  };
};

export const darkTheme: KidoLogTheme = {
  ...lightTheme,
  colors: {
    primary: '#B49AEB',
    brand: '#C2A7F5',
    primaryLight: '#362847',
    primaryInk: '#D3BDFC',
    primaryPill: '#362847',
    accent: '#48BDB8',
    background: '#15121E',
    surface: '#241D30',
    border: '#41364F',
    formBorder: '#8B7BA6',
    inputBorder: '#4E405F',
    cardBorder: '#41364F',
    text: '#F6F1FF',
    textMuted: '#B9B1C8',
    onPrimary: '#211831',
    onHero: '#FFFFFF',
    dangerFill: '#913352',
    onDanger: '#FFFFFF',
    backdrop: 'rgba(8, 5, 13, 0.72)',
    heroTint: '#E7DAFF',
    mastheadGradient: ['#201832', '#352650', '#584084'],
    mastheadWash: 'rgba(255, 255, 255, 0.11)',
    mastheadBorder: 'rgba(255, 255, 255, 0.24)',
    heroAccent: '#DCD2FF',
    indigoSurface: '#302955',
    indigoInk: '#D1C8FF',
    indigoAction: '#BEB5FA',
    onIndigoAction: '#221846',
    blueSurface: '#202F4C',
    blueInk: '#BAD8FE',
    peachSurface: '#463022',
    peachInk: '#FFD4AA',
    dangerLight: '#44263B',
    softGradient: ['#352844', '#3B2B51', '#493460'],
    authGradient: ['#15121E', '#241B33', '#38294A'],
    heroGradient: ['#422D6E', '#543A87', '#624797'],
    success: '#79DCA8',
    successInk: '#82E0BB',
    successLight: '#1D3A37',
    warning: '#E9B46F',
    amber: '#F1BF75',
    danger: '#F5A3BD',
    info: '#9BBEF6',
  },
  shadow: { card: { ...lightTheme.shadow.card, shadowColor: '#000000', shadowOpacity: 0.24 } },
};
