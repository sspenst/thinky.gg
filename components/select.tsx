import React, { useContext } from 'react';
import Color from '../constants/color';
import Link from 'next/link';
import SelectOption from '../models/selectOption';
import { WindowSizeContext } from './windowSizeContext';

interface SelectProps {
  options: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ options, prefetch }: SelectProps) {
  const windowSize = useContext(WindowSizeContext);
  const minPadding = 12;
  const optionWidth = 200;
  const optionsPerRow = Math.floor(windowSize.width / (2 * minPadding + optionWidth));
  const padding = (windowSize.width - optionWidth * optionsPerRow) / (2 * optionsPerRow);
  const selectOptions = [];

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const color = option.stats === undefined ? Color.TextDefault : option.stats.getColor();

    if (!option.href) {
      selectOptions.push(<div key={`${i}-clear`} style={{ clear: 'both' }}></div>);
    }

    selectOptions.push(
      <div
        key={i}
        style={{
          float: 'left',
          padding: `${minPadding}px ${padding}px`,
          transition: 'opacity 0.4s'
        }}
      >
        {option.href ?
          <Link href={option.href} passHref prefetch={prefetch}>
            <button
              className={'border-2 rounded-md scale'}
              style={{
                borderColor: color,
                color: color,
                height: option.height,
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
              {option.stats?.getText()}
            </button>
          </Link> :
          <div
            className={'text-xl'}
            style={{
              height: option.height,
              lineHeight: option.height + 'px',
              textAlign: 'center',
              verticalAlign: 'middle',
              width: optionWidth,
            }}>
            {option.text}
          </div>
          }
      </div>
    );
  }

  return (
    <div
      style={{
        height: windowSize.height,
        overflowY: 'scroll',
        width: windowSize.width,
      }}
      className={'hide-scroll'}
    >
      {selectOptions}
    </div>
  );
}
