import React, { useContext } from 'react';
import { AppContext } from '../contexts/appContext';
import { FilterSelectOption } from '../helpers/filterSelectOptions';
import FilterButton from './filterButton';

interface SelectFilterProps {
  filter: FilterSelectOption;
  onFilterClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  placeholder: string;
  searchText: string;
  setSearchText: (searchText: string) => void;
}

export default function SelectFilter({
  filter,
  onFilterClick,
  placeholder,
  searchText,
  setSearchText
}: SelectFilterProps) {
  const { user } = useContext(AppContext);

  return (
    <div className='flex justify-center'>
      <div className='flex items-center justify-center' role='group'>
        {user && <>
          <FilterButton
            element={<>{'Hide Won'}</>}
            first={true}
            onClick={onFilterClick}
            selected={filter === FilterSelectOption.HideWon}
            value={FilterSelectOption.HideWon}
          />
          <FilterButton
            element={<>{'Show Won'}</>}
            onClick={onFilterClick}
            proRequired={true}
            selected={filter === FilterSelectOption.ShowWon}
            value={FilterSelectOption.ShowWon}
          />
          <FilterButton
            element={<>{'Show In Progress'}</>}
            last={true} onClick={onFilterClick}
            proRequired={true}
            selected={filter === FilterSelectOption.ShowInProgress}
            value={FilterSelectOption.ShowInProgress}
          />
        </>}
        <div className='p-2'>
          <input key={'search_levels'} id='search-levels' type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={placeholder} onChange={e => setSearchText(e.target.value)} value={searchText} />
        </div>
      </div>
    </div>
  );
}
