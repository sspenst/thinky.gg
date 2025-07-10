import SendAdminMessage from '@root/components/admin/sendAdminMessage';
import { Settings } from 'lucide-react';
import React from 'react';
import CommandButton from '../shared/CommandButton';
import CommandMenu from '../shared/CommandMenu';
import { IAdminCommand } from '../types';

interface SystemOperationsTabProps {
  commandsGeneral: IAdminCommand[];
  selectedGenericCommand?: IAdminCommand;
  selectedUserCommand?: IAdminCommand;
  runningCommand: boolean;
  onCommandSelect: (command: IAdminCommand) => void;
  onRunCommand: () => void;
  setRunningCommand: (running: boolean) => void;
}

export default function SystemOperationsTab({
  commandsGeneral,
  selectedGenericCommand,
  selectedUserCommand,
  runningCommand,
  onCommandSelect,
  onRunCommand,
  setRunningCommand
}: SystemOperationsTabProps) {
  return (
    <div className='space-y-8'>
      {/* General Commands */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center gap-3 mb-6'>
          <Settings className='w-6 h-6 text-purple-500' />
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>System Operations</h2>
        </div>
        <div className='flex gap-2'>
          <CommandMenu
            commands={commandsGeneral}
            selectedCommand={selectedGenericCommand}
            onSelect={onCommandSelect}
          />
          <CommandButton
            command={selectedGenericCommand || { label: 'Run', command: '' }}
            isRunning={runningCommand}
            onClick={onRunCommand}
          />
        </div>
      </div>
      
      {/* Admin Messages */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <SendAdminMessage
          selectedUserCommand={selectedUserCommand}
          setRunningCommand={setRunningCommand}
          runningCommand={runningCommand}
        />
      </div>
    </div>
  );
}
