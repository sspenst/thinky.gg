import Control from '../../models/control';
import React from 'react';

interface ControlsProps {
  controls: Control[];
  controlHeight: number;
  controlWidth: number;
}

export default function Controls({ controls, controlHeight, controlWidth }: ControlsProps) {
  const buttons = [];

  for (let i = 0; i < controls.length; i++) {
    const control = controls[i];

    buttons.push(
      <button
        className={'rounded-lg opacity'}
        key={i}
        onClick={() => control.action()}
        style={{
          margin: 2,
          height: controlHeight - 4,
          width: controlWidth - 4,
        }}>
        {control.text}
      </button>
    );
  }
  return (
    <div style={{
      bottom: 0,
      height: controlHeight,
      position: 'fixed',
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
