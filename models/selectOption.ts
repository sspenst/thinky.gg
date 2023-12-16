import { EnrichedLevel } from './db/level';
import SelectOptionStats from './selectOptionStats';

interface SelectOption {
  author?: string | undefined;
  disabled?: boolean;
  height?: number;
  hideDifficulty?: boolean;
  hideStats?: boolean;
  href?: string;
  id: string;
  level?: EnrichedLevel | undefined;
  onClick?: () => void;
  stats?: SelectOptionStats | undefined;
  searchLabel?: string; // text to search on, since text field is a react node with private/public lock stuff
  text: React.ReactNode;
  width?: number;
}

export default SelectOption;
