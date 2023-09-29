import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import Dimensions from '../../constants/dimensions';
import getPngDataClient from '../../helpers/getPngDataClient';
import SelectOption from '../../models/selectOption';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';

interface DraggableSelectCardProps {
  dropCard: () => void;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  option: SelectOption;
}

export default function DraggableSelectCard({
  dropCard,
  index,
  moveCard,
  option,
}: DraggableSelectCardProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level.data));
    }
  }, [option.level]);

  const color = option.stats?.getColor('var(--color)') ?? 'var(--color)';

  // useDrag - the list item is draggable
  const [, dragRef] = useDrag({
    type: 'item',
    item: { index, moveCard, option } as DraggableSelectCardProps,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // useDrop - the list item is also a drop area
  const [spec, dropRef] = useDrop({
    accept: 'item',
    drop: () => dropCard(),
    hover: (item: DraggableSelectCardProps) => {
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
      className='p-4 overflow-hidden relative inline-block align-middle'
      key={`select-card-${option.id}`}
      ref={dragDropRef as never}
    >
      <div className='wrapper rounded-md overflow-hidden relative'
        style={{
          width: Dimensions.OptionWidth,
          height: option.height ?? Dimensions.OptionHeight,
        }}
      >
        <div className='absolute background rounded-md bg-cover bg-center'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            height: option.height ?? Dimensions.OptionHeight,
            opacity: 0.25,
            transform: 'scale(1.0)',
            width: Dimensions.OptionWidth,
          }}
        />
        <div
          className={classNames(
            'border-2 rounded-md pointer-events-none items-center flex justify-center text-center',
            !option.disabled ? styles['card-border'] : undefined,
            { 'text-xl': !option.stats },
          )}
          style={{
            backgroundColor: spec.isOver ? 'var(--bg-color-4)' : undefined,
            borderColor: color,
            color: color,
            height: option.height ?? Dimensions.OptionHeight,
            textShadow: '1px 1px black',
            width: Dimensions.OptionWidth,
            // dotted border if draft
            borderStyle: option.level?.isDraft ? 'dotted' : undefined,
          }}
        >
          <SelectCardContent option={option} />
        </div>
      </div>
    </div>
  );
}
