import React from 'react';
import Dimensions from '../Constants/Dimensions';
import Control from '../Models/Control';

interface ControlsProps {
  controls: Control[];
}

export default function Controls(props: ControlsProps) {
  const buttons = [];

  for (let i = 0; i < props.controls.length; i++) {
    const control = props.controls[i];

    buttons.push(
      <button
        key={i}
        onClick={() => control.action()}
        className={'border-2 font-semibold'}
        style={{
          height: Dimensions.ControlsHeight,
          width: Dimensions.ControlsHeight,
        }}>
        {control.text}
      </button>
    );
  }
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      height: Dimensions.ControlsHeight,
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
