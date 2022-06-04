import React, { useCallback, useEffect, useState } from 'react';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LevelSelectCard from './levelSelectCard';
import SelectOption from '../models/selectOption';

export interface SelectProps {
  initOptions: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ initOptions, prefetch }: SelectProps) {
  const optionWidth = 200;
  const padding = 16;
  const [ options, setOptions ] = useState(initOptions ?? []);
  const getSelectOptions = useCallback(() => {
    const selectOptions: JSX.Element[] = [];

    for (let i = 0; i < options.length; i++) {
      selectOptions.push(
        <LevelSelectCard key={i} moveCard={moveCard} index={i} option={options[i]} padding={padding} optionWidth={optionWidth} prefetch={prefetch} />
      );
    }

    return selectOptions;
  }, [options, prefetch]);

  useEffect(() => {
    setOptions(initOptions ?? []);
  }, [initOptions]);
  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {

    const newOptions = options.map(option => option);
    const dragOption = newOptions[dragIndex];

    newOptions[dragIndex] = newOptions[hoverIndex];
    newOptions[hoverIndex] = dragOption;
    setOptions(newOptions);
  }, [options]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      margin: options?.length > 0 ? 8 : 0,
    }}>
      <DndProvider backend={HTML5Backend}>
        {getSelectOptions()}
      </DndProvider>
    </div>
  );
}
