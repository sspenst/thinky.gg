export default class Control {
  action: () => void;
  text: string;

  constructor(action: () => void, text: string) {
    this.action = action;
    this.text = text;
  }
}
