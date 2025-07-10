import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import React from 'react';
import { IAdminCommand } from '../types';

interface CommandMenuProps {
  commands: IAdminCommand[];
  selectedCommand?: IAdminCommand;
  onSelect: (command: IAdminCommand) => void;
}

export default function CommandMenu({ commands, selectedCommand, onSelect }: CommandMenuProps) {
  return (
    <Menu as='div' className='relative'>
      <MenuButton className='inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'>
        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          {selectedCommand?.label || 'Select Command'}
        </span>
        <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500' />
      </MenuButton>
      <MenuItems className='absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10'>
        {commands.map((cmd) => (
          <MenuItem key={cmd.command}>
            <button
              className={`
                w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                ${cmd.dangerous ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}
                first:rounded-t-lg last:rounded-b-lg
              `}
              onClick={() => onSelect(cmd)}
            >
              {cmd.icon && <cmd.icon className='w-4 h-4' />}
              {cmd.dangerous && <AlertTriangle className='w-4 h-4 text-red-500 dark:text-red-400' />}
              <span>{cmd.label}</span>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
