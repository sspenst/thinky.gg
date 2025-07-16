import { IAdminCommand } from '../types';

interface CommandButtonProps {
  command: IAdminCommand;
  isRunning: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function CommandButton({ command, isRunning, onClick, disabled = false }: CommandButtonProps) {
  const Icon = command.icon;
  const isDangerous = command.dangerous;
  const isDisabled = isRunning || disabled;

  return (
    <button
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
        ${isDangerous
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-blue-500 hover:bg-blue-600 text-white'
    }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      disabled={isDisabled}
      onClick={onClick}
    >
      {Icon && <Icon className='w-4 h-4' />}
      {isRunning ? 'Running...' : 'Run'}
    </button>
  );
}
