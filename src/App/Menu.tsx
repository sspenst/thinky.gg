import React from 'react';
import MenuOptions from '../Models/MenuOptions';

interface MenuProps {
  height: number;
  menuOptions: MenuOptions | undefined;
}

export default function Menu(props: MenuProps) {
  if (!props.menuOptions) {
    return null;
  }

  const leftButtons = [];

  for (let i = 0; i < props.menuOptions.left.length; i++) {
    const control = props.menuOptions.left[i];

    leftButtons.push(
      <button
        key={i}
        onClick={() => control.action()}
        className={`border-2 font-semibold`}
        style={{
          height: props.height,
          width: props.height,
        }}>
        {control.text}
      </button>
    );
  }

  const rightButtons = [];

  for (let i = 0; i < props.menuOptions.right.length; i++) {
    const control = props.menuOptions.right[i];

    rightButtons.push(
      <button
        key={i}
        onClick={() => control.action()}
        className={`border-2 font-semibold`}
        style={{
          height: props.height,
          width: props.height,
        }}>
        {control.text}
      </button>
    );
  }
  
  return (
    <div style={{width: '100%'}}>
      <div style={{
        display: 'table',
        margin: '0 auto',
      }}>
        {leftButtons}
        {props.menuOptions.text}
        {props.menuOptions.subtext ? ' - ' + props.menuOptions.subtext : null}
        {rightButtons}
      </div>
    </div>
  );
}
