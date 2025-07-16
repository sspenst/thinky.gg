import LevelCard from '@root/components/cards/levelCard';
import MultiSelectLevel from '@root/components/page/multiSelectLevel';
import Level from '@root/models/db/level';
import { Box } from 'lucide-react';
import CommandButton from '../shared/CommandButton';
import CommandMenu from '../shared/CommandMenu';
import PropertyViewer from '../shared/PropertyViewer';
import { IAdminCommand } from '../types';

interface LevelManagementTabProps {
  selectedLevel: Level | null;
  commandsLevel: IAdminCommand[];
  selectedLevelCommand?: IAdminCommand;
  runningCommand: boolean;
  onLevelSelect: (level?: Level) => void;
  onCommandSelect: (command: IAdminCommand) => void;
  onRunCommand: () => void;
}

export default function LevelManagementTab({
  selectedLevel,
  commandsLevel,
  selectedLevelCommand,
  runningCommand,
  onLevelSelect,
  onCommandSelect,
  onRunCommand
}: LevelManagementTabProps) {
  return (
    <div className='space-y-8'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center gap-3 mb-6'>
          <Box className='w-6 h-6 text-green-500' />
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Level Management</h2>
        </div>
        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Select Level</label>
            <MultiSelectLevel
              defaultValue={selectedLevel}
              onSelect={onLevelSelect}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Choose Action</label>
            <div className='flex gap-2'>
              <CommandMenu
                commands={commandsLevel}
                selectedCommand={selectedLevelCommand}
                onSelect={onCommandSelect}
              />
              <CommandButton
                command={selectedLevelCommand || { label: 'Run', command: '' }}
                isRunning={runningCommand}
                onClick={onRunCommand}
              />
            </div>
          </div>
          {selectedLevel && (
            <div className='mt-6 space-y-4'>
              <LevelCard id='admin' level={selectedLevel} />
              <PropertyViewer title='Level' obj={selectedLevel} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
