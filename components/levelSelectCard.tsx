import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import React, { useRef } from 'react';
import Link from 'next/link';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';

export interface LevelSelectCardProps {
    draggable?: boolean;
    option: SelectOption;
    optionWidth: number;
    index: number;
    padding: number;
    prefetch?: boolean;
    moveCard: (dragIndex: number, hoverIndex: number) => void;
}

export default function LevelSelectCard({ draggable, option, optionWidth, index, padding, prefetch, moveCard }: LevelSelectCardProps) {

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';
    // useDrag - the list item is draggable
  const [{ isDragging }, dragRef] = useDrag({
    type: 'item',
    item: { option, optionWidth, index, padding, prefetch, moveCard } as LevelSelectCardProps,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),

  });
  // useDrop - the list item is also a drop area
  const [spec, dropRef] = useDrop({
    accept: 'item',
    drop: (item:LevelSelectCardProps, monitor:DropTargetMonitor) => {
      // do a save?
    },
    hover: (item:LevelSelectCardProps, monitor:DropTargetMonitor) => {
      const indexThatIsHovering = item.index;
      const indexThatisHoveredOn = index;

      if (indexThatIsHovering === indexThatisHoveredOn) {
        return;
      }

      moveCard(indexThatIsHovering, indexThatisHoveredOn);
      item.index = indexThatisHoveredOn;

    },
    collect: (monitor:DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const ref = useRef(null);

  const dragDropRef = dragRef(dropRef(ref));

  return <div
    className="handle"
    key={index}
    ref={draggable ? dragDropRef as never : null}
    style={{
      display: 'inline-block',
      padding: padding,
      verticalAlign: 'middle',
    }}
  >
    {option.href ?
      <Link href={(option.disabled) ? '' : option.href} passHref prefetch={prefetch}>
        <a
          className={classNames(
            'border-2 rounded-md',
            { 'pointer-events-none': (option.disabled || option.draggable) },
            { 'scale': !option.disabled },
            { 'text-xl': !option.stats },
          )}
          style={{
            backgroundColor: spec.isOver ? '#141' : '',
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
          width: optionWidth,
        }}>
        {option.text}
      </div>
    }
  </div>;
}
