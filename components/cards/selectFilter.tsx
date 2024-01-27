import StatFilter from '@root/constants/statFilter';
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/appContext';
import FilterButton from '../buttons/filterButton';

interface SelectFilterProps {
  filter: StatFilter;
  onChange?: () => void;
  onFilterClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  placeholder: string;
  searchText: string;
  setSearchText: (searchText: string) => void;
}

export default function SelectFilter({
  filter,
  onChange,
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
              onClick={(e) => {
                onFilterClick(e);
                onChange && onChange();
              }}
              selected={filter === StatFilter.HideSolved}
              value={StatFilter.HideSolved}
            />
            <FilterButton
              element='Solved'
              onClick={(e) => {
                onFilterClick(e);
                onChange && onChange();
              } }
              selected={filter === StatFilter.Solved}
              value={StatFilter.Solved}
            />
            <FilterButton
              element='Unoptimized'
              onClick={(e) => {
                onFilterClick(e);
                onChange && onChange();
              } }
              selected={filter === StatFilter.Unoptimized}
              value={StatFilter.Unoptimized}
            />
            <FilterButton
              element='Completed'
              last={true} onClick={(e) => {
                onFilterClick(e);
                onChange && onChange();
              } }
              selected={filter === StatFilter.Completed}
              value={StatFilter.Completed}
            />
          </div>
        }
        <div className='p-2'>
          <input
            aria-describedby='button-addon2'
            aria-label='Search'
            className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal bg-clip-padding border border-solid border-color-4 rounded transition ease-in-out m-0 focus:border-blue-600 focus:outline-none'
            id='search-levels'
            key='search_levels'
            onChange={e => {
              setSearchText(e.target.value);
              onChange && onChange();
            }}
            placeholder={placeholder}
            type='search'
            value={searchText}
          />
        </div>
      </div>
    </div>
  );
}
