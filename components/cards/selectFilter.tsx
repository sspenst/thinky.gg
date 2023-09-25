import StatFilter from '@root/constants/statFilter';
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import FilterButton from '../buttons/filterButton';

interface SelectFilterProps {
  filter: StatFilter;
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
      <div className='flex flex-wrap items-center justify-center' role='group'>
        {user &&
          <div className='flex'>
            <FilterButton
              element={<>{'Hide Won'}</>}
              first={true}
              onClick={onFilterClick}
              selected={filter === StatFilter.HideWon}
              value={StatFilter.HideWon}
            />
            <FilterButton
              element={<>{'Show Won'}</>}
              onClick={onFilterClick}
              proRequired={true}
              selected={filter === StatFilter.ShowWon}
              value={StatFilter.ShowWon}
            />
            <FilterButton
              element={<>{'Show In Progress'}</>}
              last={true} onClick={onFilterClick}
              proRequired={true}
              selected={filter === StatFilter.ShowInProgress}
              value={StatFilter.ShowInProgress}
            />
          </div>
        }
        <div className='p-2'>
          <input key={'search_levels'} id='search-levels' type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={placeholder} onChange={e => setSearchText(e.target.value)} value={searchText} />
        </div>
      </div>
    </div>
  );
}
