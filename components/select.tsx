import React, { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import Color from '../constants/color';
import SelectOption from '../models/selectOption';
import { WindowSizeContext } from './windowSizeContext';

interface SelectProps {
  options: SelectOption[];
}

export default function Select({ options }: SelectProps) {
  const windowSize = useContext(WindowSizeContext);
  const minPadding = 12;
  const optionWidth = 200;
  const optionsPerRow = Math.floor(windowSize.width / (2 * minPadding + optionWidth));
  const padding = (windowSize.width - optionWidth * optionsPerRow) / (2 * optionsPerRow);
  const selectOptions = [];

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const color = option.stats === undefined ? Color.TextDefault : option.stats.getColor();

    selectOptions.push(
      <div
        key={i}
        style={{
          float: 'left',
          padding: `${minPadding}px ${padding}px`,
          transition: 'opacity 0.4s'
        }}
      >
        <Link href={option.href}>
          <button
            className={'border-2 rounded-md font-semibold scale'}
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
            {!option.stats ? '...' : option.stats.getText()}
          </button>
        </Link>
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
