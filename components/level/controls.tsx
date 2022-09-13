import classNames from 'classnames';
import React, { useContext } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import styles from './Controls.module.css';

interface ControlsProps {
  controls: Control[];
}

export default function Controls({ controls }: ControlsProps) {
  const buttons = [];
  const { windowSize } = useContext(PageContext);

  // use the default control size or shrink to fit the screen
  const fitControlWidth = Math.floor(windowSize.width / (controls.length ? controls.length : 1));
  const controlWidth = Dimensions.ControlWidth < fitControlWidth ?
    Dimensions.ControlWidth : fitControlWidth;

  for (let i = 0; i < controls.length; i++) {
    const control = controls[i];

    buttons.push(
      <button
        id={control.id}
        className={classNames(
          'rounded-lg duration-300 hover:duration-100 ease',
          { 'pointer-events-none': control.disabled },
          control.blue ? 'bg-blue-500 text-gray-300 hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition' : control.disabled ? null : styles.control,
        )}
        key={`control-${control.id}`}
        onClick={() => control.action()}
        style={{
          color: control.disabled ? 'var(--bg-color-4)' : 'var(--color)',
          margin: 2,
          height: Dimensions.ControlHeight - 4,
          width: controlWidth - 4,
        }}>
        {control.element}
      </button>
    );
  }

  return (
    <div className={'select-none flex justify-center'} style={{
      height: Dimensions.ControlHeight,
    }}>
      {buttons}
    </div>
  );
}
