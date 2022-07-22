import Dimensions from '../constants/dimensions';
import Level from './db/level';
import SelectOptionStats from './selectOptionStats';

export default class SelectOption {
  id: string;
  author: string | undefined;
  disabled: boolean;
  draggable: boolean;
  height: number;
  href: string | undefined;
  level: Level | undefined;
  points: number | undefined;
  stats: SelectOptionStats | undefined;
  text: string;

  constructor(
    id: string,
    text: string,
    href: string | undefined = undefined,
    stats: SelectOptionStats | undefined = undefined,
    height: number = Dimensions.OptionHeight,
    // level option properties:
    author: string | undefined = undefined,
    points: number | undefined = undefined,
    level: Level | undefined = undefined,
    disabled = false,
    draggable = false,
  ) {
    this.id = id;
    this.author = author;
    this.disabled = disabled;
    this.height = height;
    this.href = href;
    this.level = level;
    this.points = points;
    this.stats = stats;
    this.text = text;
    this.draggable = draggable;
  }

  clone() {
    return new SelectOption(
      this.id,
      this.text,
      this.href,
      this.stats?.clone(),
      this.height,
      this.author,
      this.points,
      this.level,
      this.disabled,
      this.draggable,
    );
  }
}
