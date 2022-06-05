export default class Control {
  action: () => void;
  disabled: boolean;
  text: string;
  id: string;
  constructor(
    action: () => void,
    text: string,
    disabled = false,
    id:string = null
  ) {
    this.action = action;
    this.disabled = disabled;
    this.text = text;
    this.id = id;
  }
}
