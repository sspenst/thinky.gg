export default class Control {
  action: () => void;
  blue: boolean;
  disabled: boolean;
  element: JSX.Element;
  id: string;

  constructor(
    id: string,
    action: () => void,
    element: JSX.Element,
    disabled = false,
    blue = false,
  ) {
    this.action = action;
    this.blue = blue;
    this.disabled = disabled;
    this.element = element;
    this.id = id;
  }
}
