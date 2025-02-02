import { JSX } from 'react';

export default class Control {
  action: () => void;
  blue: boolean;
  disabled: boolean;
  element: JSX.Element;
  id: string;
  holdAction?: () => boolean;

  constructor(
    id: string,
    action: () => void,
    element: JSX.Element,
    disabled = false,
    blue = false,
    holdAction?: () => boolean
  ) {
    this.action = action;
    this.blue = blue;
    this.disabled = disabled;
    this.element = element;
    this.id = id;
    this.holdAction = holdAction;
  }
}
