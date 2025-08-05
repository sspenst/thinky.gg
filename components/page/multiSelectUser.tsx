/* eslint-disable @typescript-eslint/no-explicit-any */
import User from '@root/models/db/user';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import AsyncSelect from 'react-select/async';
import { debounce } from 'throttle-debounce';
import Dimensions from '../../constants/dimensions';
import FormattedUser from '../formatted/formattedUser';

interface MultiSelectUserProps {
  className?: string;
  controlStyles?: any;
  defaultValue?: User | null;
  onSelect?: (selectedList: any, selectedItem: any) => void;
  placeholder?: string
}

export default function MultiSelectUser({ className, controlStyles, defaultValue, onSelect, placeholder }: MultiSelectUserProps) {
  const [options, setOptions] = useState([]);
  const [value, setValue] = useState(defaultValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  if (!isMounted) {
    return <div className={classNames('text-left text-base', className)} style={{ height: 44 }} />;
  }

  return <AsyncSelect
    backspaceRemovesValue={true}
    className={classNames('text-left text-base', className)}
    components={{
      DropdownIndicator: null,
      IndicatorSeparator: null,
    }}
    formatOptionLabel={(option: any, { context }: any) => (
      <div style={{
        animation: context === 'menu' ? 'fadeIn 0.1s ease-out' : 'none',
        animationDelay: context === 'menu' ? `${(options.findIndex((opt: any) => opt._id === option._id) * 0.02)}s` : '0s',
        animationFillMode: 'both'
      }}>
        <FormattedUser id='select' noLinks noTooltip size={Dimensions.AvatarSizeSmall} user={option} />
      </div>
    )}
    getOptionLabel={(option: any) => option.name}
    getOptionValue={(option: any) => option._id.toString()}
    inputId='search-author-input-async-select-input'
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
    // https://react-select.com/styles - Updated with glassmorphism theme
    styles={{
      control: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderColor: state.isFocused ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)',
        borderRadius: '0.75rem',
        borderWidth: '1px',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(139, 92, 246, 0.2)' : 'none',
        cursor: 'text',
        height: 44,
        maxWidth: '100%',
        minWidth: '100%',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(255, 255, 255, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
        ...controlStyles,
      }),
      container: (provided: any) => ({
        ...provided,
        maxWidth: '100%',
      }),
      dropdownIndicator: (provided: any) => ({
        ...provided,
        color: 'rgba(255, 255, 255, 0.7)',
        '&:hover': {
          color: 'rgba(255, 255, 255, 0.9)',
        },
      }),
      input: (provided: any) => ({
        ...provided,
        color: 'white',
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '0.75rem',
        borderWidth: '1px',
        marginTop: '4px',
        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 9999,
        animation: 'fadeInDown 0.2s ease-out',
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? 'rgba(139, 92, 246, 0.3)'
          : state.isFocused
            ? 'rgba(255, 255, 255, 0.1)'
            : 'transparent',
        color: 'white',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
        },
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '12px 16px',
        transition: 'all 0.2s ease',
        animation: 'fadeInUp 0.15s ease-out',
        animationDelay: `${(provided.index || 0) * 0.03}s`,
        animationFillMode: 'both',
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: 'rgba(255, 255, 255, 0.6)',
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: 'white',
      }),
    }}
    value={value}
  />;
}
