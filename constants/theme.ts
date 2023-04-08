import { MONKEY_THEME_ICONS, ThemeIconProps } from '@root/components/theme/monkey';
import LevelUtil, { TileType } from './levelDataType';

enum Theme {
  Modern = 'theme-modern',
  Monkey = 'theme-monkey',
  Classic = 'theme-classic',
  Light = 'theme-light',
  Dark = 'theme-dark',
  Accessible = 'theme-accessible',
  BossMode = 'theme-boss',
  Winter = 'theme-winter',
  Halloween = 'theme-halloween',
}

export function getIconFromTheme(theme?: Theme | string, tileType?: TileType): ((props: ThemeIconProps) => JSX.Element) | undefined {
  if (theme) {
    const themeMap = ICON_MAP[theme as Theme];

    if (themeMap && tileType) {
      return themeMap[tileType];
    }
  }

  return undefined;
}

export const ICON_MAP: Partial<Record<Theme, Partial<Record<TileType, (props: ThemeIconProps) => JSX.Element>>>> = {
  [Theme.Monkey]: MONKEY_THEME_ICONS,
};

export default Theme;
