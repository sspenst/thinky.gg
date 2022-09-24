import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import { getFormattedDifficulty } from './difficultyDisplay';
import styles from './SelectCard.module.css';

interface SelectCardProps {
  draggable?: boolean;
  dropCard: () => void;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  option: SelectOption;
  prefetch?: boolean;
}

export default function SelectCard({
  draggable,
  dropCard,
  index,
  moveCard,
  option,
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
    item: { index, moveCard, option, prefetch } as SelectCardProps,
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
      className='handle p-4 overflow-hidden'
      key={`select-card-${option.id}`}
      ref={draggable ? dragDropRef as never : null}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        position: 'relative',
      }}
    >
      <div className='wrapper rounded-md overflow-hidden'
        style={{
          width: Dimensions.OptionWidth,
          height: option.height,
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
            <div
              className={classNames('font-bold break-words p-4', { 'text-sm': option.text.length >= 25 })}
              style={{
                width: Dimensions.OptionWidth,
              }}
            >
              {option.text}
              {option.author && <div>{option.author}</div>}
              {getFormattedDifficulty(option.level)}
              {option.stats && <div className='italic text-sm pt-1'>{option.stats.getText()}</div>}
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
