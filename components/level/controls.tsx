import classNames from 'classnames';
import React from 'react';
import Control from '../../models/control';
import styles from './Controls.module.css';

interface ControlsProps {
  controls: Control[];
}

export default function Controls({ controls }: ControlsProps) {
  return (
    <div className='select-none flex flex-row justify-center z-10 h-8 sm:h-11 text-xs sm:text-base'>
      {controls.map((control) => (
        <button
          id={control.id}
          className={classNames(
            'rounded-lg duration-300 hover:duration-100 ease m-1 basis-22',
            { 'pointer-events-none': control.disabled },
            control.blue ? 'bg-blue-500 text-gray-300 hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition' : control.disabled ? null : styles.control,
          )}
          key={`control-${control.id}`}
          onClick={() => control.action()}
          style={{
            color: control.disabled ? 'var(--bg-color-4)' : 'var(--color)',
            margin: 2,
          }}>
          {control.element}
        </button>
      ))}
    </div>
  );
}
