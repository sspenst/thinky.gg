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
              element='Hide Solved'
              first={true}
              onClick={onFilterClick}
              selected={filter === StatFilter.HideSolved}
              value={StatFilter.HideSolved}
            />
            <FilterButton
              element='Solved'
              onClick={onFilterClick}
              selected={filter === StatFilter.Solved}
              value={StatFilter.Solved}
            />
            <FilterButton
              element='In Progress'
              last={true} onClick={onFilterClick}
              selected={filter === StatFilter.InProgress}
              value={StatFilter.InProgress}
            />
          </div>
        }
        <div className='p-2'>
          <input key={'search_levels'} id='search-levels' type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal bg-clip-padding border border-solid border-color-4 rounded transition ease-in-out m-0 focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={placeholder} onChange={e => setSearchText(e.target.value)} value={searchText} />
        </div>
      </div>
    </div>
  );
}
