import { To } from 'react-router-dom';
import SelectOptionStats from './SelectOptionStats';

export default class SelectOption {
  height: number;
  stats: SelectOptionStats | undefined;
  subtext: string | undefined;
  text: string;
  to: To;

  constructor(
    stats: SelectOptionStats | undefined,
    text: string,
    to: To,
    height: number = 100,
    subtext: string | undefined = undefined,
  ) {
    this.height = height;
    this.stats = stats;
    this.subtext = subtext;
    this.text = text;
    this.to = to;
  }
}
