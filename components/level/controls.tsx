import classNames from 'classnames';
import React, { useRef } from 'react';
import Control from '../../models/control';
import styles from './Controls.module.css';

interface ControlsProps {
  controls: Control[];
}

function isTouchEventWithElement(e: TouchEvent): boolean {
  const element = e.target as HTMLElement;
  const item = e.changedTouches.item(0);

  if (element === null || item === null) return false;

  return element.getBoundingClientRect().right > item.clientX &&
      element.getBoundingClientRect().left < item.clientX &&
      element.getBoundingClientRect().top < item.clientY &&
      element.getBoundingClientRect().bottom > item.clientY;
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
    if (interval.current) {
      clearInterval(interval.current as NodeJS.Timeout);
    }

    interval.current = setTimeout(() => {
      const shouldContinue = whileHold(control);

      if (!shouldContinue) { return; }

      onMouseDown(control, 100);
    }, ms);
  };

  const onMouseUp = () => {
    if (interval.current) {
      clearTimeout(interval.current);
    }
  };
  const useTouch = useRef(false);
  const mouseDownStartTs = useRef(0);

  return (
    <div className='select-none flex justify-center z-10 min-h-[44px] text-xs sm:text-base'>
      {controls.map((control) => (
        <button
          className={classNames(
            'border border-gray-500 md:p-1 p-1 pt-2 py-2 flex w-full justify-center items-center rounded-lg duration-300 hover:duration-100 ease select-none touch-none m-0.5 max-w-64',
            { 'cursor-default': control.disabled },
            control.blue ? 'bg-blue-500 text-gray-300 hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition' : control.disabled ? null : styles.control,
          )}
          id={control.id}
          key={`control-${control.id}`}
          onClick={(e: React.MouseEvent) => {
            if (control.disabled) { return; }

            control.action();
            e.stopPropagation();
          }}
          onMouseDown={(e: React.MouseEvent) => {
            if (Date.now() - mouseDownStartTs.current < 500) {
              return;
            }

            mouseDownStartTs.current = Date.now();

            if (useTouch.current) { return; }

            if (control.holdAction) {
              onMouseDown(control);
            }

            e.stopPropagation();
          }}
          onMouseOut={(e: React.MouseEvent) => {
            onMouseUp();
            e.stopPropagation();
          }}
          onMouseUp={(e: React.MouseEvent) => {
            if (useTouch.current) { return; }

            onMouseUp();
            e.stopPropagation();
          }}
          onTouchEnd={(e: React.TouchEvent<HTMLButtonElement>) => {
            onMouseUp();
            e.stopPropagation();
          }}
          onTouchMove={(e: React.TouchEvent<HTMLButtonElement>) => {
            // check if isTouchEventWithElement
            if (isTouchEventWithElement(e.nativeEvent)) {
              return;
            }

            e.stopPropagation();
          }}
          onTouchStart={(e: React.TouchEvent<HTMLButtonElement>) => {
            if (Date.now() - mouseDownStartTs.current < 500) {
              return;
            }

            mouseDownStartTs.current = Date.now();

            if (!control.holdAction) {
              return;
            }

            useTouch.current = true;
            onMouseDown(control);
            e.stopPropagation();
          }}
          style={{
            color: control.disabled ? 'var(--bg-color-4)' : 'var(--color)',
          }}
        >
          {control.element}
        </button>
      ))}
    </div>
  );
}
