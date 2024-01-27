import { Menu, Transition } from '@headlessui/react';
import React, { Fragment, useState } from 'react';

interface SimpleDropdownProps {
  items: { label: string; value?: string }[];
  className?: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (item: { label: string; value?: string }) => void;
}

export default function SimpleDropdown({
  items,
  className,
  placeholder,
  defaultValue,
  onChange,
}: SimpleDropdownProps) {
  const [selectedItem, setSelectedItem] = useState<{ label: string; value?: string } | null>(items.find(item => item.value === defaultValue) || items[0] || null);

  return (
    <Menu as='div' className={`${className} relative inline-block text-left w-auto`}>
      <Menu.Button className='inline-flex justify-center py-2 px-1 text-xs text-black bg-white rounded-md shadow-sm hover:bg-gray-50'>
        {selectedItem ? selectedItem.label : placeholder}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='transform opacity-0 scale-95'
        enterTo='transform opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='transform opacity-100 scale-100'
        leaveTo='transform opacity-0 scale-95'
      >
        <Menu.Items className='absolute z-10 mt-1 origin-top-right bg-white divide-y divide-gray-100 rounded-md '>
          {items.map(item => (
            <Menu.Item key={item.value}>
              {({ active }) => (
                <button
                  className={`${
                    active ? 'bg-blue-500 text-white' : 'text-gray-900'
                  } group flex items-center w-full px-2 py-2 text-xs`}
                  onClick={() => {
                    setSelectedItem(item.value === defaultValue ? null : item);

                    if (onChange) {
                      onChange(item);
                    }
                  }

                  }
                >
                  {item.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
