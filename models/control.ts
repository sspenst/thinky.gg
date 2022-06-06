export default class Control {
  action: () => void;
  disabled: boolean;
  text: string;
  id: string;
  constructor(
    id:string,
    action: () => void,
    text: string,
    disabled = false,
  ) {
    this.action = action;
    this.disabled = disabled;
    this.text = text;
    this.id = id;
  }
}
