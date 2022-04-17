import Dimensions from '../constants/dimensions';
import SelectOptionStats from './selectOptionStats';

export default class SelectOption {
  author: string | undefined;
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
  ) {
    this.author = author;
    this.points = points;
    this.height = height;
    this.href = href;
    this.stats = stats;
    this.text = text;
  }
}
