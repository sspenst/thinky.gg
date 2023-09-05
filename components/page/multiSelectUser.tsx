/* eslint-disable @typescript-eslint/no-explicit-any */
import User from '@root/models/db/user';
import React, { useState } from 'react';
import AsyncSelect from 'react-select/async';
import { debounce } from 'throttle-debounce';
import Dimensions from '../../constants/dimensions';
import FormattedUser from '../formatted/formattedUser';

interface MultiSelectUserProps {
  controlStyles?: any;
  defaultValue?: User | null;
  onSelect?: (selectedList: any, selectedItem: any) => void;
  placeholder?: string
}

export default function MultiSelectUser({ controlStyles, defaultValue, onSelect, placeholder }: MultiSelectUserProps) {
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState(defaultValue);

  const doSearch = async (searchText: any, callback: any) => {
    const search = encodeURI(searchText) || '';

    const res = await fetch('/api/user/search?search=' + search, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await res.json();

    setOptions(data);
    callback(data);
  };
  const debounceDoSearch = debounce(500, doSearch);

  return <AsyncSelect
    backspaceRemovesValue={true}
    className='text-left text-base'
    components={{
      DropdownIndicator: null,
      IndicatorSeparator: null,
    }}
    formatOptionLabel={(option: any) => (
      <FormattedUser size={Dimensions.AvatarSizeSmall} noLinks={true} user={option} />
    )}
    getOptionLabel={(option: any) => option.name}
    getOptionValue={(option: any) => option._id.toString()}
    id='search-author-input-async-select'
    instanceId='search-author-input-async-select'
    isClearable={true}
    loadOptions={debounceDoSearch}
    noOptionsMessage={() => 'No users found'}
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
    placeholder={placeholder ? placeholder : 'Search users...'}
    // https://react-select.com/styles
    styles={{
      control: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: 'white',
        borderColor: state.isFocused ? 'rgb(37 99 235)' : 'rgb(209 213 219)',
        borderRadius: '0.375rem',
        borderWidth: '1px',
        boxShadow: 'none',
        cursor: 'text',
        height: '2.5rem',
        width: '13rem',
        ...controlStyles,
      }),
      dropdownIndicator: (provided: any) => ({
        ...provided,
        color: 'black',
        // change to search icon
        '&:hover': {
          color: 'gray',
        },
      }),
      input: (provided: any) => ({
        ...provided,
        color: 'rgb(55 65 81)',
      }),
      menu: (provided: any) => ({
        ...provided,
        borderColor: 'rgb(209 213 219)',
        borderRadius: '0.375rem',
        borderWidth: '1px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        marginTop: '2px',
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#e2e8f0' : 'white',
        color: 'black',
        '&:hover': {
          backgroundColor: '#e2e8f0',
        },
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: 'rgb(156 163 175)',
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: 'black',
      }),
    }}
    value={value}
  />;
}