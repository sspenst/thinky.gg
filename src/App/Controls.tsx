import React from 'react';
import Control from '../Models/Control';

interface ControlsProps {
  controls: Control[];
  height: number;
}

export default function Controls(props: ControlsProps) {
  const buttons = [];

  for (let i = 0; i < props.controls.length; i++) {
    const control = props.controls[i];

    buttons.push(
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
        {buttons}
      </div>
    </div>
  );
}
