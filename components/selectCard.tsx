import classNames from 'classnames';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import Dimensions from '../constants/dimensions';
import getPngDataClient from '../helpers/getPngDataClient';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
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

  const drawGradientDiv = (level?: EnrichedLevel) => {
    if (!level) {
      return '';
    }

    const value = level.difficultyEstimate;

    if (!value) {
      return <div className='italic text-sm pt-1'>Difficulty: {level.points}*</div>;
    }

    const difficultyMap: Record<number, string> = {
      0: 'Kinder 🍼',
      60: 'Elementary School 🧒🏻', // 0-60 seconds average completion
      120: 'Middle School 🤓', // 1-2 minutes average completion
      300: 'High School 🎓', // 5-10 minutes average completion
      600: 'College 🧑‍🎓', // 10-20 minutes average completion
      1200: 'Graduate School 👩‍🏫', // 20-40 minutes average completion
      2400: 'PhD 🔬', // 40-80 minutes average completion
      4800: 'Master 🥷', // 1-2 hours average completion
      9600: 'Grandmaster 📜', // 2-4 hours average completion
      19200: 'Super Grandmaster 🪬' // 4+ hours average completion

    };
    let label = 'Unknown';
    let icon = '❓';

    // set label to the highest difficulty that is lower than the value
    for (const key in difficultyMap) {
      if (value < parseInt(key)) {
        break;
      }

      // remove last character from label
      const labelSplit = difficultyMap[key].split(' ');

      console.log(labelSplit.join('|'));
      icon = labelSplit.pop() as string;

      label = labelSplit.join(' ');
    }

    return <div className='pt-1'><span className='italic'>{label}</span> <span className='text-md'>{icon}</span></div>;
  };

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
              {option.points !== undefined && drawGradientDiv(option.level)}
              {option.stats && <div className='italic text-sm pt-1'>{option.stats.getText()}</div>}
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
