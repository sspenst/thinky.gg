export default class Control {
  action: () => void;
  disabled: boolean;
  id: string;
  text: string;
  id: string;
  constructor(
    id: string,
    action: () => void,
    text: string,
    disabled = false,
  ) {
    this.action = action;
    this.disabled = disabled;
    this.id = id;
    this.text = text;
    this.id = id;
  }
}
