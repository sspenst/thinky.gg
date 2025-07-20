import React from 'react';

interface HeadToHeadDisplayProps {
  player1Name: string;
  player2Name: string;
  wins: number;
  losses: number;
  ties: number;
  className?: string;
}

export default function HeadToHeadDisplay({
  player1Name,
  player2Name,
  wins,
  losses,
  ties,
  className = ''
}: HeadToHeadDisplayProps) {
  const total = wins + losses + ties;
  const winRate = total > 0 ? (wins / total * 100).toFixed(0) : 0;

  return (
    <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className='text-center mb-3'>
        <h3 className='text-sm font-medium text-gray-600 dark:text-gray-400'>Head to Head</h3>
        <div className='flex items-center justify-center gap-2 mt-1'>
          <span className='font-bold text-gray-900 dark:text-gray-100'>{player1Name}</span>
          <span className='text-gray-500 dark:text-gray-400'>vs</span>
          <span className='font-bold text-gray-900 dark:text-gray-100'>{player2Name}</span>
        </div>
      </div>
      <div className='flex justify-center items-center gap-6'>
        <div className='text-center'>
          <div className='text-2xl font-bold text-green-600 dark:text-green-400'>{wins}</div>
          <div className='text-xs text-gray-600 dark:text-gray-400 uppercase'>Wins</div>
        </div>
        <div className='text-gray-400 dark:text-gray-500 text-2xl'>-</div>
        <div className='text-center'>
          <div className='text-2xl font-bold text-red-600 dark:text-red-400'>{losses}</div>
          <div className='text-xs text-gray-600 dark:text-gray-400 uppercase'>Losses</div>
        </div>
        <div className='text-gray-400 dark:text-gray-500 text-2xl'>-</div>
        <div className='text-center'>
          <div className='text-2xl font-bold text-gray-600 dark:text-gray-400'>{ties}</div>
          <div className='text-xs text-gray-600 dark:text-gray-400 uppercase'>Draws</div>
        </div>
      </div>
      {total > 0 && (
        <div className='mt-3 text-center'>
          <div className='text-sm text-gray-600 dark:text-gray-400'>
            Win Rate: <span className='font-semibold text-gray-900 dark:text-gray-100'>{winRate}%</span>
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
            {total} {total === 1 ? 'match' : 'matches'} played
          </div>
        </div>
      )}
    </div>
  );
}
