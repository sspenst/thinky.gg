import Color from '../../constants/color';
import Control from '../../models/control';
import React from 'react';

interface ControlsProps {
  controls: Control[];
  controlSize: number;
}

export default function Controls({ controls, controlSize }: ControlsProps) {
  const buttons = [];

  for (let i = 0; i < controls.length; i++) {
    const control = controls[i];

    buttons.push(
      <button
        className={'border-2 rounded-xl'}
        key={i}
        onClick={() => control.action()}
        style={{
          backgroundColor: 'rgb(100, 100, 100)',
          borderColor: Color.Background,
          height: controlSize,
          width: controlSize,
        }}>
        {control.text}
      </button>
    );
  }
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      height: controlSize,
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
