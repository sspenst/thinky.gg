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
  searchLabel?: string; // text to search on, since text field is a react node (default is text?.toString())
  stats?: SelectOptionStats | undefined;
  text: React.ReactNode;
  width?: number;
}

export default SelectOption;
