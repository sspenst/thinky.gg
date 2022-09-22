import React from 'react';
import AsyncSelect from 'react-select/async';
import { debounce } from 'throttle-debounce';
import FormattedUser from './formattedUser';

export default function MultiSelectUser({ onSelect, defaultValue, inputClassnames }: { inputClassnames?: string, defaultValue?: string, onSelect?: (selectedList: any, selectedItem: any) => void }) {
  const [options, setOptions] = React.useState([]);

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
  const classNames = inputClassnames || 'bg-gray-200 rounded-lg text-black';

  return <AsyncSelect
    options={options} // Options to display in the dropdown
    loadOptions={debounceDoSearch}
    autoFocus={true}
    noOptionsMessage={() => 'No users found'}
    onChange={(selectedOption: any, selectedAction: any) => {
      if (onSelect) {
        if (selectedAction.action === 'clear') {
          onSelect('', selectedAction);
        }
        else {
          onSelect(selectedOption, selectedAction);
        }
      }
    }}
    backspaceRemovesValue={true}
    defaultInputValue={defaultValue}
    getOptionLabel={(option: any) => option.name}
    getOptionValue={(option: any) => option._id.toString()}
    formatOptionLabel={(option: any) => (
      <FormattedUser user={option} />
    )}
    components={{
      DropdownIndicator: null,
      IndicatorSeparator: null,

    }}
    placeholder='Search users...'
    isClearable={true}
    styles={{
      dropdownIndicator: (provided: any, state: any) => ({
        ...provided,
        color: 'black',
        // change to search icon
        '&:hover': {
          color: 'gray',
        },
      }),
      input: (provided: any, state: any) => ({
        ...provided,
        color: 'black',

      }),
      control: (provided: any) => ({
        ...provided,
        backgroundColor: 'white',
        /* rounded-lg */
        borderRadius: '0.5rem',
        borderWidth: '0px',
        boxShadow: 'none',
        width: '200px',
        '&:hover': {
          borderColor: '#cbd5e0',
        },
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#e2e8f0' : 'white',
        color: 'black',
        '&:hover': {
          backgroundColor: '#e2e8f0',
        },
        // elipsis
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }),
      menu: (provided: any) => ({
        ...provided,
        borderRadius: '0.375rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: 'black',
      }),
    }}
  />;
}
