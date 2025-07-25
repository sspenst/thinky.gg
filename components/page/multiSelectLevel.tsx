/* eslint-disable @typescript-eslint/no-explicit-any */
import Level from '@root/models/db/level';
import { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { debounce } from 'throttle-debounce';

interface MultiSelectLevelProps {
  controlStyles?: any;
  defaultValue?: Level | null;
  onSelect?: (selectedList: any, selectedItem: any) => void;
  placeholder?: string
}

export default function MultiSelectLevel({ controlStyles, defaultValue, onSelect, placeholder }: MultiSelectLevelProps) {
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState(defaultValue);

  const doSearch = async (searchText: any, callback: any) => {
    const search = encodeURI(searchText) || '';

    const res = await fetch('/api/search?search=' + search, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await res.json();

    setOptions(data?.levels);
    callback(data?.levels);
  };
  const debounceDoSearch = debounce(500, doSearch);

  return <AsyncSelect
    backspaceRemovesValue={true}
    className='text-left text-base'
    components={{
      DropdownIndicator: null,
      IndicatorSeparator: null,
    }}
    formatOptionLabel={(option: Level) => (
      <span>{option.name}</span>
    )}
    getOptionLabel={(option: any) => option.name}
    getOptionValue={(option: any) => option._id.toString()}
    id='search-author-input-async-select'
    instanceId='search-author-input-async-select'
    isClearable={true}
    loadOptions={debounceDoSearch}
    noOptionsMessage={() => 'No levels found'}
    onChange={(selectedOption: any, selectedAction: any) => {
      setValue(selectedOption);

      if (!selectedAction) {
        return;
      }

      if (onSelect) {
        if (selectedAction.action === 'clear') {
          onSelect('', selectedAction);
        } else {
          onSelect(selectedOption, selectedAction);
        }
      }
    }}
    options={options} // Options to display in the dropdown
    placeholder={placeholder ? placeholder : 'Search levels...'}
    // https://react-select.com/styles
    styles={{
      control: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: 'var(--bg-color)',
        borderColor: state.isFocused ? 'rgb(59 130 246)' : 'var(--bg-color-3)',
        borderRadius: '0.25rem',
        borderWidth: '1px',
        boxShadow: 'none',
        cursor: 'text',
        height: 42,
        maxWidth: '100%',
        minWidth: '13rem',
        '&:hover': {
          borderColor: undefined,
        },
        ...controlStyles,
      }),
      container: (provided: any) => ({
        ...provided,
        maxWidth: '100%',
      }),
      dropdownIndicator: (provided: any) => ({
        ...provided,
        color: 'var(--color)',
        // change to search icon
        '&:hover': {
          color: 'var(--color)',
        },
      }),
      input: (provided: any) => ({
        ...provided,
        color: 'var(--color)',
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-4)',
        borderRadius: '0.25rem',
        borderWidth: '1px',
        marginTop: '2px',
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected ? 'var(--bg-color-3)' : 'var(--bg-color-2)',
        color: 'var(--color)',
        '&:hover': {
          backgroundColor: 'var(--bg-color-3)',
        },
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: 'var(--color-gray)',
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: 'var(--color)',
      }),
    }}
    value={value}
  />;
}
