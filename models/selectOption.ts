import Dimensions from '../constants/dimensions';
import SelectOptionStats from './selectOptionStats';

export default class SelectOption {
  id: string;
  author: string | undefined;
  disabled: boolean;
  height: number;
  href: string | undefined;
  points: number | undefined;
  stats: SelectOptionStats | undefined;
  text: string;
  draggable: boolean;
  backgroundImage: string | undefined;

  constructor(
    id: string,
    text: string,
    href: string | undefined = undefined,
    backgroundImage: string | undefined = undefined,
    stats: SelectOptionStats | undefined = undefined,
    height: number = Dimensions.OptionHeight,
    author: string | undefined = undefined,
    points: number | undefined = undefined,
    disabled = false,
    draggable = false,
  ) {
    this.id = id;
    this.author = author;
    this.disabled = disabled;
    this.height = height;
    this.href = href;
    this.backgroundImage = backgroundImage;
    this.points = points;
    this.stats = stats;
    this.text = text;
    this.draggable = draggable;
  }
}
