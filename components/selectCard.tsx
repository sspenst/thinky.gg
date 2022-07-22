import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import React, { useEffect, useRef, useState } from 'react';
import Dimensions from '../constants/dimensions';
import Link from 'next/link';
import SelectOption from '../models/selectOption';
import classNames from 'classnames';
import getPngDataClient from '../helpers/getPngDataClient';
import styles from './SelectCard.module.css';

interface SelectCardProps {
  draggable?: boolean;
  dropCard: () => void;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  option: SelectOption;
  padding: number;
  prefetch?: boolean;
}

export default function SelectCard({
  draggable,
  dropCard,
  index,
  moveCard,
  option,
  padding,
  prefetch,
}: SelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  // useDrag - the list item is draggable
  const [, dragRef] = useDrag({
    type: 'item',
    item: { index, moveCard, option, padding, prefetch } as SelectCardProps,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // useDrop - the list item is also a drop area
  const [spec, dropRef] = useDrop({
    accept: 'item',
    drop: () => dropCard(),
    hover: (item: SelectCardProps) => {
      const indexThatIsHovering = item.index;
      const indexThatisHoveredOn = index;

      if (indexThatIsHovering === indexThatisHoveredOn) {
        return;
      }

      moveCard(indexThatIsHovering, indexThatisHoveredOn);
      item.index = indexThatisHoveredOn;
    },
    collect: (monitor: DropTargetMonitor) => ({
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
      <div className='wrapper rounded-md'
        style={{
          width: Dimensions.OptionWidth,
          height: option.height,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div className='background rounded-md'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: option.height,
            opacity: 0.25,
            position: 'absolute',
            transform: draggable ? 'scale(1.0)' : 'scale(1.6)',
            width: Dimensions.OptionWidth,
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
                alignItems: 'center',
                backgroundColor: spec.isOver ? 'var(--bg-color-4)' : undefined,
                borderColor: color,
                color: color,
                display: 'flex',
                height: option.height,
                justifyContent: 'center',
                textAlign: 'center',
                textShadow: color !== 'var(--color)' ? '1px 1px black' : undefined,
                width: Dimensions.OptionWidth,
              }}
            >
              <span
                className={classNames('font-bold break-words', { 'text-sm': option.text.length >= 25 })}
                style={{
                  padding: padding,
                  width: Dimensions.OptionWidth,
                }}
              >
                {option.text}
                {!option.author ? null :
                  <>
                    <br/>
                    {option.author}
                  </>
                }
                {option.points === undefined ? null :
                  <>
                    <br/>
                    <span className='italic text-sm'>
                      Difficulty: {option.points}
                    </span>
                  </>
                }
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
              width: Dimensions.OptionWidth,
            }}>
            {option.text}
          </div>
        }
      </div>
    </div>
  );
}
