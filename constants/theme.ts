import { MONKEY_THEME_ICONS } from '@root/components/theme/monkey';

const Theme: {[theme: string]: string} = {
  'Modern': 'theme-modern',
  'Monkey': 'theme-monkey',
  'Classic': 'theme-classic',
  'Light': 'theme-light',
  'Dark': 'theme-dark',
  'Accessible': 'theme-accessible',
  'Boss Mode': 'theme-boss',
  'Winter': 'theme-winter',
  'Halloween': 'theme-halloween',
};

export const ICON_MAP = {
  [Theme.Monkey]: MONKEY_THEME_ICONS
} as any;

export default Theme;
