import React, { useCallback, useContext } from 'react';
import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';

interface SelectProps {
  options: (SelectOption | undefined)[];
  prefetch?: boolean;
}

export default function Select({ options, prefetch }: SelectProps) {
  const optionWidth = 200;
  const padding = 16;
  const { windowSize } = useContext(PageContext);
  const optionsPerRow = Math.floor(windowSize.width / (2 * padding + optionWidth)) || 1;

  const getSelectOptions = useCallback(() => {
    function getRow() {
      const row: JSX.Element[] = [];
      const startIndex = index;
    
      while (index < options.length && index < startIndex + optionsPerRow) {
        const option = options[index];
    
        if (!option) {
          break;
        }

        const color = option.stats?.getColor('var(--color)') ?? 'var(--color)';
    
        row.push(
          <div
            key={index}
            style={{
              display: 'inline-block',
              padding: padding,
              verticalAlign: 'middle',
            }}
          >
            {option.href ?
              <Link href={option.href} passHref prefetch={prefetch}>
                <button
                  className={classNames('border-2 rounded-md scale', { 'text-xl': !option.stats })}
                  style={{
                    borderColor: color,
                    color: color,
                    height: option.height,
                    padding: 10,
                    width: optionWidth,
                  }}
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
                  {option.stats ?
                    <>
                      {option.stats.getText()}
                      <br/>
                    </>
                  : null}
                </button>
              </Link>
            :
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
        
        index++;
      }
    
      selectOptions.push(
        <div
          key={startIndex}
          style={{
            display: 'table',
            margin: '0 auto',
          }}
        >
          {row}
        </div>
      );
    }

    const selectOptions: JSX.Element[] = [];

    let index = 0;
  
    while (index < options.length) {
      // add empty space
      if (!options[index]) {
        selectOptions.push(
          <div
            key={index}
            style={{
              clear: 'both',
              height: 32,
            }}
          />
        );
        index += 1;
        continue;
      }
  
      getRow();
    }

    return selectOptions;
  }, [options, optionsPerRow, prefetch]);

  return (
    <div
      style={{
        height: windowSize.height,
        overflowY: 'scroll',
        width: windowSize.width,
      }}
      className={'hide-scroll'}
    >
      {getSelectOptions()}
    </div>
  );
}
