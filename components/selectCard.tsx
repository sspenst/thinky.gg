import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import React, { useRef } from 'react';
import Link from 'next/link';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';
import styles from './SelectCard.module.css';

interface SelectCardProps {
  draggable?: boolean;
  index: number;
  moveCard: (doSave: boolean, dragIndex?: number, hoverIndex?: number) => void;
  option: SelectOption;
  optionWidth: number;
  padding: number;
  prefetch?: boolean;
}

export default function SelectCard({
  draggable,
  index,
  moveCard,
  option,
  optionWidth,
  padding,
  prefetch,
}: SelectCardProps) {
  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';
  // useDrag - the list item is draggable
  const [, dragRef] = useDrag({
    type: 'item',
    item: { index, moveCard, option, optionWidth, padding, prefetch } as SelectCardProps,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  // useDrop - the list item is also a drop area
  const [spec, dropRef] = useDrop({
    accept: 'item',
    drop: () => {
      // do a save?
      moveCard(true);
    },
    hover: (item: SelectCardProps) => {
      const indexThatIsHovering = item.index;
      const indexThatisHoveredOn = index;

      if (indexThatIsHovering === indexThatisHoveredOn) {
        return;
      }

      moveCard(false, indexThatIsHovering, indexThatisHoveredOn);
      item.index = indexThatisHoveredOn;
    },
    collect: (monitor:DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    }),
  });

  const ref = useRef(null);
  const dragDropRef = dragRef(dropRef(ref));

  return (
    <div
      className='handle'
      key={index}
      ref={draggable ? dragDropRef as never : null}
      style={{
        display: 'inline-block',
        padding: padding,
        verticalAlign: 'middle',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className='wrapper'
        style={{
          width: optionWidth,
          height: option.height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div className='background rounded-md'
          style={{
            backgroundImage: 'url(/api/level/image/' + option.id + ')',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: optionWidth,
            height: option.height,
            position: 'absolute',
            opacity: 0.25,
            transform: 'scale(1.6)',
          }}
        />
        {option.href ?
          <Link href={(option.disabled) ? '' : option.href} passHref prefetch={prefetch}>
            <a
              className={classNames(
                'border-2 rounded-md',
                { 'pointer-events-none': (option.disabled || option.draggable) },
                !option.disabled ? styles['card-border'] : undefined,
                { 'text-xl': !option.stats },
              )}
              style={{
                backgroundColor: spec.isOver ? '#141' : '',
                borderColor: color,
                color: spec.isOver ? 'black' : color,
                display: 'table',
                height: option.height,
                textAlign: 'center',
                width: optionWidth,
              }}
            >
              <span
                className={option.text.length < 25 ? 'font-bold display-block text-center' : 'font-bold display-block text-xs text-center'}
                style={{
                  display: 'table-cell',
                  verticalAlign: 'middle',
                }}
              >
                {option.text}
                <span className='text-center'>
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
                      <span className='italic text-sm'>
                        Difficulty: {option.points}
                      </span>
                    </>
                    : null}
                  <br/>
                  <span className='italic text-sm'>
                    {option.stats ?
                      <>
                        {option.stats.getText()}
                        <br/>
                      </>
                      : null}
                  </span>
                </span>
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
    </div>
  );
}
