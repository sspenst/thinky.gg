import classNames from 'classnames';
import React, { useRef } from 'react';
import Control from '../../models/control';
import styles from './Controls.module.css';

interface ControlsProps {
  controls: Control[];
}

export default function Controls({ controls }: ControlsProps) {
  // click and hold
  const whileHold = (control: Control) => {
    if (control.holdAction) {
      const couldAction = control.holdAction();

      if (!couldAction) {
        onMouseUp();

        return false;
      }
    }

    return true;
  };

  const interval = useRef<NodeJS.Timeout | null>(null);
  const onMouseDown = (control: Control, ms = 500) => {
    const shouldContinue = whileHold(control);

    if (!shouldContinue) { return; }

    interval.current = setTimeout(() => {
      onMouseDown(control, 100);
    }, ms);
  };

  const onMouseUp = () => {
    if (interval.current) {
      clearTimeout(interval.current);
    }
  };
  const useTouch = useRef(false);

  return (
    <div className='select-none flex flex-row justify-center z-10 h-9 sm:h-11 text-xs sm:text-base'>
      {controls.map((control) => (
        <button
          id={control.id}
          className={classNames(
            'rounded-lg duration-300 hover:duration-100 ease m-1 basis-22',
            { 'pointer-events-none': control.disabled },
            control.blue ? 'bg-blue-500 text-gray-300 hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition' : control.disabled ? null : styles.control,
          )}
          key={`control-${control.id}`}
          onMouseDown={(e: React.MouseEvent) => {
            if (useTouch.current) { return; }

            if (control.holdAction) {
              onMouseDown(control);
            } else {
              control.action();
            }

            e.stopPropagation();
            e.preventDefault();
          }
          }
          onMouseLeave={onMouseUp}
          onMouseUp={onMouseUp}
          onTouchStart={(e: React.TouchEvent<HTMLButtonElement>) => {
            useTouch.current = true;

            if (control.holdAction) {
              onMouseDown(control);
            } else {
              control.action();
            }

            e.stopPropagation();
            e.preventDefault();
          }
          }
          onTouchEnd={onMouseUp}
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
