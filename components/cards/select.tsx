import { JSX, useCallback, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SelectOption from '../../models/selectOption';
import DraggableSelectCard from './draggableSelectCard';
import SelectCard from './selectCard';

interface SelectProps {
  // onchange is a function accepting an array
  onChange?: (items: SelectOption[]) => void;
  options: SelectOption[];
  prefetch?: boolean;
}

export default function Select({ onChange, options, prefetch }: SelectProps) {
  const [selectOptions, setSelectOptions] = useState(options ?? []);

  useEffect(() => {
    setSelectOptions(options);
  }, [options]);

  const dropCard = useCallback(() => {
    if (!onChange) {
      return;
    }

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
  }, [onChange, options, selectOptions]);

  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    setSelectOptions(prevSelectOptions => {
      const newOptions = prevSelectOptions.map(option => { return { ...option }; });
      const dragCard = newOptions[dragIndex];

      newOptions.splice(dragIndex, 1);
      newOptions.splice(hoverIndex, 0, dragCard);

      return newOptions;
    });
  }, []);

  const getSelectCards = useCallback(() => {
    const selectCards: JSX.Element[] = [];

    for (let i = 0; i < selectOptions.length; i++) {
      selectCards.push(
        !onChange ?
          <SelectCard
            key={`select-${selectOptions[i].id}`}
            option={selectOptions[i]}
            prefetch={prefetch}
          />
          :
          <DraggableSelectCard
            dropCard={dropCard}
            index={i}
            key={`select-${selectOptions[i].id}`}
            moveCard={moveCard}
            option={selectOptions[i]}
          />
      );
    }

    return selectCards;
  }, [dropCard, moveCard, onChange, prefetch, selectOptions]);

  return (
    <div className='flex flex-wrap justify-center gap-2'>
      <DndProvider backend={HTML5Backend}>{getSelectCards()}</DndProvider>
    </div>
  );
}
