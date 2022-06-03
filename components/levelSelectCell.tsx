import Link from 'next/link';
import React from 'react';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';

export type LevelSelectCellProps ={
    option: SelectOption;
    optionWidth: number;
    key: number;
    padding: number;
    prefetch?: boolean
}
export default function LevelSelectCell(cellProps:LevelSelectCellProps) {
  const option = cellProps.option;
  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  return <div
    className="handle"
    key={cellProps.key}
    style={{
      display: 'inline-block',
      padding: cellProps.padding,
      verticalAlign: 'middle',
    }}
  >
    {option.href ?
      <Link href={(option.disabled) ? '' : option.href} passHref prefetch={cellProps.prefetch}>
        <a
          className={classNames(
            'border-2 rounded-md',
            { 'pointer-events-none': (option.disabled || option.draggable) },
            { 'scale': !option.disabled },
            { 'text-xl': !option.stats },
          )}
          style={{
            borderColor: color,
            color: color,
            display: 'table',
            height: option.height,
            padding: 10,
            textAlign: 'center',
            width: cellProps.optionWidth,
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
            Difficulty: {option.points}
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
          width: cellProps.optionWidth,
        }}>
        {option.text}
      </div>
    }
  </div>;
}
