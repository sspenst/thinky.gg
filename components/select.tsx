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
  const padding = 16;
  const [selectOptions, setSelectOptions] = useState(options ?? []);

  useEffect(() => {
    setSelectOptions(options);
  }, [options]);

  const moveCard = useCallback(
    (doSave: boolean, dragIndex?: number, hoverIndex?: number) => {
      // query server to update

      if (onChange && doSave) {
        // extra safe error checking to avoid NRE
        if (options.length !== selectOptions.length) {
          return onChange(selectOptions);
        }

        // check if an update is required
        for (let i = 0; i < options.length; i++) {
          if (options[i].id !== selectOptions[i].id) {
            return onChange(selectOptions);
          }
        }

        // the order hasn't changed, don't need to update
        return;
      }

      if (dragIndex === undefined || hoverIndex === undefined) {
        return;
      }

      const newOptions = selectOptions.map((option) => option);

      const dragCard = newOptions[dragIndex];

      newOptions.splice(dragIndex, 1);
      newOptions.splice(hoverIndex, 0, dragCard);

      setSelectOptions(newOptions);
    },
    [onChange, options, selectOptions]
  );

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
          padding={padding}
          prefetch={prefetch}
        />
      );
    }

    return selectCards;
  }, [moveCard, onChange, selectOptions, prefetch]);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        margin: selectOptions.length > 0 ? 8 : 0,
      }}
    >
      <DndProvider backend={HTML5Backend}>{getSelectCards()}</DndProvider>
    </div>
  );
}
