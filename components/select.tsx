import React, { useCallback } from 'react';
import Link from 'next/link';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';

interface SelectProps {
  options: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ options, prefetch }: SelectProps) {
  const optionWidth = 200;
  const padding = 16;

  const getSelectOptions = useCallback(() => {
    const selectOptions: JSX.Element[] = [];

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const color = option.stats?.getColor('var(--color)') ?? 'var(--color)';
  
      selectOptions.push(
        <div
          key={i}
          style={{
            display: 'inline-block',
            padding: padding,
            verticalAlign: 'middle',
          }}
        >
          {option.href ?
          <Link href={option.href} passHref prefetch={prefetch}>
            <a 
              className={classNames('border-2 rounded-md scale', { 'text-xl': !option.stats })}
              style={{
                borderColor: color,
                color: color,
                display: 'table',
                height: option.height,
                padding: 10,
                textAlign: 'center',
                width: optionWidth,
              }}
            >
              <span style={{
                display: 'table-cell',
                verticalAlign: 'middle',
              }}>
                {option.text}
                {option.author ?
                  <>
                    <br/>
                    <span className=''>
                      {option.author}
                    </span>
                  </>
                : null}
                {option.points !== undefined ?
                  <>
                    <br/>
                    <span className='italic'>
                      {option.points} point{option.points !== 1 ? 's' : null}
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
              </span>
            </a>
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
    }

    return selectOptions;
  }, [options, prefetch]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      {getSelectOptions()}
    </div>
  );
}
