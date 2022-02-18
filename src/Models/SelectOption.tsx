import SelectOptionStats from './SelectOptionStats';

export default class SelectOption {
  id: string;
  stats: SelectOptionStats | undefined;
  subtext: string | undefined;
  text: string;

  constructor(
    id: string,
    stats: SelectOptionStats | undefined,
    subtext: string | undefined = undefined,
    text: string,
  ) {
    this.id = id;
    this.stats = stats;
    this.subtext = subtext;
    this.text = text;
  }
}
