export default class Control {
  action: () => void;
  disabled: boolean;
  element: JSX.Element;
  id: string;

  constructor(
    id: string,
    action: () => void,
    element: JSX.Element,
    disabled = false,
  ) {
    this.action = action;
    this.disabled = disabled;
    this.element = element;
    this.id = id;
  }
}
