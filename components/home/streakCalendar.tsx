import useSWRHelper from '@root/hooks/useSWRHelper';
import CalHeatmap from 'cal-heatmap';
import React, { useEffect, useRef, useState } from 'react';
import LoadingSpinner from '../page/loadingSpinner';

export function StreakCalendar() {
  // type is {currentStreak:number, calendar:[{key:string: count:number}
  const { data, isLoading } = useSWRHelper<{ currentStreak: number, calendar: { date: string, value: number }[] }>('/api/streak');
  const [isExpanded, setIsExpanded] = useState(false);
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!isExpanded) return;

    const cal = new CalHeatmap();

    // Get UTC midnight for start date
    const startDate = new Date();

    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setUTCHours(0, 0, 0, 0);

    // Get UTC midnight for today
    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);

    cal.paint(
      {
        data: {
          source: data?.calendar,
          x: 'date',
          y: 'value',

        },
        date: {
          start: startDate,
          highlight: [today],
        },

        range: 2,
        scale: {
          color: {
            type: 'threshold',
            scheme: 'Purples',
            domain: [-100, 0],
          },
        },
        domain: {
          type: 'month',
          gutter: 10,
          dynamicDimension: false,
        },

        subDomain: {
          type: 'xDay',
          radius: 6,
          label: 'D',
          width: 15,
          height: 15,
        },
        itemSelector: '#cal-heatmap',
      },

    );

    return () => {
      cal.destroy();
    };
  }, [data?.calendar, isExpanded]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 flex flex-col items-center'>
      <div
        className='flex items-center justify-between w-full cursor-pointer'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <div className='bg-purple-100 dark:bg-purple-900 p-2 rounded-full'>
            <span className='text-xl'>🔥</span>
          </div>
          <div className='flex flex-col'>
            <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>Play Streak</span>
            <span className='text-xl font-bold'>{data?.currentStreak} day{data?.currentStreak === 1 ? '' : 's'}</span>
          </div>
        </div>
        <button className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition'>
          {isExpanded ? (
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z' clipRule='evenodd' />
            </svg>
          ) : (
            <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
              <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
            </svg>
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className='w-full mt-4'>
          <div id='cal-heatmap' ref={heatmapRef} className='overflow-x-auto flex justify-center' />
          <div className='text-xs text-gray-500 dark:text-gray-400 text-center mt-2'>
            Current UTC Time: {new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      )}
    </div>
  );
}
