import React from 'react';
import Color from '../Constants/Color';
import Control from '../Models/Control';

interface ControlsProps {
  controls: Control[];
  controlSize: number;
}

export default function Controls(props: ControlsProps) {
  const buttons = [];

  for (let i = 0; i < props.controls.length; i++) {
    const control = props.controls[i];

    buttons.push(
      <button
        className={'border-2 rounded-xl font-semibold'}
        key={i}
        onClick={() => control.action()}
        style={{
          backgroundColor: 'rgb(100, 100, 100)',
          borderColor: Color.Background,
          height: props.controlSize,
          width: props.controlSize,
        }}>
        {control.text}
      </button>
    );
  }
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      height: props.controlSize,
      width: '100%',
    }}>
      <div style={{
        display: 'table',
        margin: '0 auto',
      }}>
        {buttons}
      </div>
    </div>
  );
}
