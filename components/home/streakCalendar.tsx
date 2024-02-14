import useSWRHelper from '@root/hooks/useSWRHelper';
import CalHeatmap from 'cal-heatmap';
import React, { useEffect, useRef } from 'react';
import LoadingSpinner from '../page/loadingSpinner';

export function StreakCalendar() {
  // type is {currentStreak:number, calendar:[{key:string: count:number}
  const { data, isLoading } = useSWRHelper<{currentStreak: number, calendar: {date: string, value: number}[]}>('/api/streak');

  const heatmapRef = useRef(null);

  useEffect(() => {
    const cal = new CalHeatmap();

    cal.paint(
      {
        data: {
          source: data?.calendar,
          x: 'date',
          y: 'value',

        },
        date: {
          // start 1 month ago
          start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          highlight: [new Date()],
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
  }, [data?.calendar]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (<details className='flex flex-col gap-2 justify-center text-center bg-3 p-1 rounded-lg'>
    <summary className='p-1'>Play Streak: <span className='font-bold p-1 bg-purple-700 rounded-full text-white'>{data?.currentStreak}</span> day{data?.currentStreak === 1 ? '' : 's'}!</summary>
    { /* put cal-heatmap within a horizontal scrollable div */}
    <div id='cal-heatmap' ref={heatmapRef} className='overflow-x-scroll justify-center flex' />
  </details>
  );
}
