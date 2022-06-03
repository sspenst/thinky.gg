import React, { useCallback } from 'react';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LevelSelectCard from './levelSelectCard';
import SelectOption from '../models/selectOption';

export interface SelectProps {
  options: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ options, prefetch }: SelectProps) {
  const optionWidth = 200;
  const padding = 16;

  const getSelectOptions = useCallback(() => {
    const selectOptions: JSX.Element[] = [];

    console.log('-');

    for (let i = 0; i < options.length; i++) {
      console.log(i, options[i].text);
      selectOptions.push(
        <LevelSelectCard key={i} moveCard={moveCard} index={i} option={options[i]} padding={padding} optionWidth={optionWidth} prefetch={prefetch} />
      );
    }

    return selectOptions;
  }, [options, prefetch]);
  const cards = getSelectOptions;
  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {

    // swap options[dragIndex] and options[hoverIndex];
    const dragOption = options[dragIndex];

    options[dragIndex] = options[hoverIndex];
    options[hoverIndex] = dragOption;
    cards();

  }, []);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      margin: cards().length > 0 ? 8 : 0,
    }}>
      <DndProvider backend={HTML5Backend}>
        {cards()}
      </DndProvider>
    </div>
  );
}
