import Dimensions from '../constants/dimensions';
import SelectOptionStats from './selectOptionStats';

export default class SelectOption {
  author: string | undefined;
  disabled: boolean;
  height: number;
  href: string | undefined;
  points: number | undefined;
  stats: SelectOptionStats | undefined;
  text: string;

  constructor(
    text: string,
    href: string | undefined = undefined,
    stats: SelectOptionStats | undefined = undefined,
    height: number = Dimensions.OptionHeight,
    author: string | undefined = undefined,
    points: number | undefined = undefined,
    disabled = false,
  ) {
    this.author = author;
    this.disabled = disabled;
    this.height = height;
    this.href = href;
    this.points = points;
    this.stats = stats;
    this.text = text;
  }
}
