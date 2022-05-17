export default class Control {
  action: () => void;
  disabled: boolean;
  text: string;

  constructor(
    action: () => void,
    text: string,
    disabled = false,
  ) {
    this.action = action;
    this.disabled = disabled;
    this.text = text;
  }
}
