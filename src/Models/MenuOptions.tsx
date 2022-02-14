import Control from './Control';

export default class MenuOptions {
  left: Control[];
  right: Control[];
  subtitle: string | undefined;
  title: string;

  constructor(
    left: Control[],
    right: Control[],
    subtitle: string | undefined,
    title: string
  ) {
    this.left = left;
    this.right = right;
    this.subtitle = subtitle;
    this.title = title;
  }
}
