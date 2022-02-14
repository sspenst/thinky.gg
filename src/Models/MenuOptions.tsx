import Control from './Control';

export default class MenuOptions {
  left: Control[];
  right: Control[];
  subtext: string | undefined;
  text: string;

  constructor(
    left: Control[],
    right: Control[],
    subtext: string | undefined,
    text: string
  ) {
    this.left = left;
    this.right = right;
    this.subtext = subtext;
    this.text = text;
  }
}
