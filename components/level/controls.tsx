import React, { useContext } from 'react';
import Control from '../../models/control';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import classNames from 'classnames';
import styles from './Controls.module.css';

interface ControlsProps {
  controls: Control[];
}

export default function Controls({ controls }: ControlsProps) {
  const buttons = [];
  const { windowSize } = useContext(PageContext);

  // use the default control size or shrink to fit the screen
  const fitControlWidth = Math.floor(windowSize.width / controls.length);
  const controlWidth = Dimensions.ControlWidth < fitControlWidth ?
    Dimensions.ControlWidth : fitControlWidth;

  for (let i = 0; i < controls.length; i++) {
    const control = controls[i];

    buttons.push(
      <button
        className={classNames('rounded-lg', styles.control)}
        key={i}
        onClick={() => control.action()}
        style={{
          margin: 2,
          height: Dimensions.ControlHeight - 4,
          width: controlWidth - 4,
        }}>
        {control.text}
      </button>
    );
  }
  return (
    <div
      className={'select-none'}
      style={{
        bottom: 0,
        height: Dimensions.ControlHeight,
        position: 'fixed',
        width: '100%',
      }}
    >
      <div style={{
        display: 'table',
        margin: '0 auto',
      }}>
        {buttons}
      </div>
    </div>
  );
}
