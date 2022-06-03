import React, { useCallback } from 'react';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LevelSelectCell from './levelSelectCell';
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

    for (let i = 0; i < options.length; i++) {

      selectOptions.push(
        <LevelSelectCell option={options[i]} optionWidth={optionWidth} key={i} padding={padding} prefetch={prefetch}/>
      );
    }

    return selectOptions;
  }, [options, prefetch]);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      margin: getSelectOptions().length > 0 ? 8 : 0,
    }}>
      <DndProvider backend={HTML5Backend}>
        {getSelectOptions()}
      </DndProvider>
    </div>
  );
}
