import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

// Geometry and paint are taken from the originals in assets/kidolog.
const icons = {
  settings: {
    size: 24,
    artwork: (
      <>
        <Path
          d="M12 3.85L12.8 3.89L13.95 2.19L14.9 2.43L15.83 2.76L16.71 3.18L16.53 5.22L17.17 5.7L17.76 6.24L18.3 6.83L20.31 6.44L20.82 7.29L21.24 8.17L21.57 9.1L19.99 10.41L20.11 11.2L20.15 12L20.11 12.8L21.81 13.95L21.57 14.9L21.24 15.83L20.82 16.71L18.78 16.53L18.3 17.17L17.76 17.76L17.17 18.3L17.56 20.31L16.71 20.82L15.83 21.24L14.9 21.57L13.59 19.99L12.8 20.11L12 20.15L11.2 20.11L10.05 21.81L9.1 21.57L8.17 21.24L7.29 20.82L7.47 18.78L6.83 18.3L6.24 17.76L5.7 17.17L3.69 17.56L3.18 16.71L2.76 15.83L2.43 14.9L4.01 13.59L3.89 12.8L3.85 12L3.89 11.2L2.19 10.05L2.43 9.1L2.76 8.17L3.18 7.29L5.22 7.47L5.7 6.83L6.24 6.24L6.83 5.7L6.44 3.69L7.29 3.18L8.17 2.76L9.1 2.43L10.41 4.01L11.2 3.89L12 3.85Z"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
        <Path
          d="M15.1 12C15.1 13.7121 13.7121 15.1 12 15.1C10.2879 15.1 8.9 13.7121 8.9 12C8.9 10.2879 10.2879 8.9 12 8.9C13.7121 8.9 15.1 10.2879 15.1 12Z"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
      </>
    ),
  },
  plus: {
    size: 24,
    artwork: (
      <Path
        d="M12 5V19M5 12H19"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    ),
  },
  users: {
    size: 24,
    artwork: (
      <>
        <Path
          d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
        <Path
          d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
        <Path
          d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
        <Path
          d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
      </>
    ),
  },
  cloud: {
    size: 21,
    artwork: (
      <>
        <Defs>
          <ClipPath id="clip0_0_81">
            <Rect width="21" height="21" fill="white" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#clip0_0_81)">
          <Path
            d="M17.5 14.875C18.3248 14.695 19.0567 14.2229 19.5609 13.5458C20.0651 12.8687 20.3076 12.0322 20.2436 11.1904C20.1797 10.3487 19.8137 9.55836 19.213 8.96517C18.6123 8.37198 17.8175 8.01588 16.975 7.9625C16.4551 6.71924 15.5398 5.68213 14.3708 5.01183C13.2017 4.34154 11.8443 4.07549 10.5087 4.25489C9.17311 4.4343 7.93398 5.04915 6.98327 6.00418C6.03256 6.95922 5.42334 8.20113 5.25 9.5375C4.42617 9.71155 3.70522 10.2057 3.24576 10.9113C2.7863 11.6169 2.62595 12.4762 2.8 13.3C2.97405 14.1238 3.46823 14.8448 4.17384 15.3042C4.87944 15.7637 5.73867 15.924 6.5625 15.75H16.625"
            strokeWidth="1.6625"
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="currentColor"
          />
          <Path
            d="M13.125 12.25L10.5 9.625L7.875 12.25M10.5 9.625V18.375"
            strokeWidth="1.6625"
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="currentColor"
          />
        </G>
      </>
    ),
  },
  search: {
    size: 19,
    artwork: (
      <>
        <Path
          d="M14.25 8.70833C14.25 11.7689 11.7689 14.25 8.70833 14.25C5.64776 14.25 3.16667 11.7689 3.16667 8.70833C3.16667 5.64776 5.64776 3.16667 8.70833 3.16667C11.7689 3.16667 14.25 5.64776 14.25 8.70833Z"
          strokeWidth="1.50417"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
        <Path
          d="M12.6667 12.6667L16.625 16.625"
          strokeWidth="1.50417"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="currentColor"
        />
      </>
    ),
  },
  chevron: {
    size: 16,
    artwork: (
      <Path
        d="M6 12L10 8L6 4"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      />
    ),
  },
  avatar: {
    size: 50,
    artwork: <Circle cx="25" cy="25" r="25" fill="currentColor" />,
  },
  'hero-circle': {
    size: 118,
    artwork: <Circle opacity="0.24" cx="59" cy="59" r="59" fill="#F5E4FF" />,
  },
  'hero-circle-small': {
    size: 76,
    artwork: <Circle opacity="0.26" cx="38" cy="38" r="38" fill="#DCC4FF" />,
  },
} as const;

export type KidoLogIconName = keyof typeof icons;

export function KidoLogIcon({
  name,
  size,
  color,
}: {
  name: KidoLogIconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  const ink =
    color ??
    (name === 'avatar'
      ? colors.primaryLight
      : name === 'search' || name === 'chevron'
        ? colors.textMuted
        : colors.primaryInk);
  const icon = icons[name];
  const displaySize = size ?? icon.size;

  return (
    <Svg
      accessible={false}
      pointerEvents="none"
      width={displaySize}
      height={displaySize}
      viewBox={`0 0 ${icon.size} ${icon.size}`}
      fill="none"
      color={ink}
    >
      {icon.artwork}
    </Svg>
  );
}
