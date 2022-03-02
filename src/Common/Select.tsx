import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import Dimensions from '../Constants/Dimensions';
import SelectOption from '../Models/SelectOption';
import Color from '../Constants/Color';
import { WindowSizeContext } from './WindowSizeContext';

interface SelectProps {
  optionHeight?: number;
  options: SelectOption[];
  pathname: string;
  top: number;
}

export default function Select({ optionHeight, options, pathname, top }: SelectProps) {
  const windowSize = useContext(WindowSizeContext);
  const [opacity, setOpacity] = useState<number[]>(Array(options.length).fill(0));
  const minPadding = 12;
  const optionWidth = 200;
  const optionsPerRow = Math.floor(windowSize.width / (2 * minPadding + optionWidth));
  const padding = (windowSize.width - optionWidth * optionsPerRow) / (2 * optionsPerRow);
  const selectOptions = [];

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < options.length; i++) {
      const x = i % optionsPerRow;
      const y = Math.floor(i / optionsPerRow);
      const timeout = (x + y) * 30;

      timeouts.push(setTimeout(() => {
        setOpacity(prevOpacity => {
          const opacity = [...prevOpacity];
          opacity[i] = 1;
          return opacity;
        });
      }, timeout));
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [options.length, optionsPerRow]);

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const color = option.stats === undefined ? Color.TextDefault : option.stats.getColor();

    selectOptions.push(
      <div
        key={i}
        style={{
          float: 'left',
          opacity: opacity[i] === undefined ? 0 : opacity[i],
          padding: `${minPadding}px ${padding}px`,
          transition: 'opacity 0.4s'
        }}
      >
        <Link to={{
          pathname: `/${pathname}`,
          search: `id=${option.id}`,
        }}>
          <button
            className={'border-2 rounded-md font-semibold scale'}
            style={{
              borderColor: color,
              color: color,
              height: optionHeight === undefined ? 100 : optionHeight,
              width: optionWidth,
            }}
            tabIndex={-1}
          >
            {option.text}
            {option.subtext ?
              <>
                <br/>
                <span className='italic'>
                  {option.subtext}
                </span>
              </>
            : null}
            <br/>
            {option.stats === undefined ? '...' : option.stats.getText()}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        height: windowSize.height - top,
        overflowY: 'scroll',
        position: 'fixed',
        top: Dimensions.MenuHeight,
        width: windowSize.width,
      }}
      className={'hide-scroll'}
    >
      {selectOptions}
    </div>
  );
}
