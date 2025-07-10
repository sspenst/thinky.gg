import React from 'react';
import { IAdminCommand } from '../types';

interface CommandButtonProps {
  command: IAdminCommand;
  isRunning: boolean;
  onClick: () => void;
}

export default function CommandButton({ command, isRunning, onClick }: CommandButtonProps) {
  const Icon = command.icon;
  const isDangerous = command.dangerous;

  return (
    <button
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
        ${isDangerous
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-blue-500 hover:bg-blue-600 text-white'
    }
        ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      disabled={isRunning}
      onClick={onClick}
    >
      {Icon && <Icon className='w-4 h-4' />}
      {isRunning ? 'Running...' : 'Run'}
    </button>
  );
}
