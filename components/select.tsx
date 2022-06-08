import React, { useCallback, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SelectCard from './selectCard';
import SelectOption from '../models/selectOption';

interface SelectProps {
  // onchange is a function accepting an array
  onChange?: (items: SelectOption[]) => void;
  options: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ onChange, options, prefetch }: SelectProps) {
  const optionWidth = 200;
  const padding = 16;
  const [selectOptions, setSelectOptions] = useState(options ?? []);

  useEffect(() => {
    setSelectOptions(options);
  }, [options]);

  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    const newOptions = selectOptions.map(option => option);
    const dragOption = newOptions[dragIndex];

    newOptions[dragIndex] = newOptions[hoverIndex];
    newOptions[hoverIndex] = dragOption;
    setSelectOptions(newOptions);

    // query server to update
    if (onChange) {
      onChange(newOptions);
    }
  }, [selectOptions, onChange]);

  const getSelectCards = useCallback(() => {
    const selectCards: JSX.Element[] = [];

    for (let i = 0; i < selectOptions.length; i++) {
      selectCards.push(
        <SelectCard
          draggable={!!onChange}
          index={i}
          key={i}
          moveCard={moveCard}
          option={selectOptions[i]}
          optionWidth={optionWidth}
          padding={padding}
          prefetch={prefetch}
        />
      );
    }

    return selectCards;
  }, [moveCard, onChange, selectOptions, prefetch]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      margin: selectOptions.length > 0 ? 8 : 0,
    }}>
      <DndProvider backend={HTML5Backend}>
        {getSelectCards()}
      </DndProvider>
    </div>
  );
}
