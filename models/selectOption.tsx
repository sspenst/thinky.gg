import Dimensions from '../constants/dimensions';
import SelectOptionStats from './selectOptionStats';

export default class SelectOption {
  height: number;
  href: string;
  stats: SelectOptionStats | undefined;
  subtext: string | undefined;
  text: string;

  constructor(
    href: string,
    stats: SelectOptionStats | undefined,
    text: string,
    height: number = Dimensions.OptionHeight,
    subtext: string | undefined = undefined,
  ) {
    this.height = height;
    this.href = href;
    this.stats = stats;
    this.subtext = subtext;
    this.text = text;
  }
}
