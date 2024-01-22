import useSWRHelper from '@root/hooks/useSWRHelper';
import CalHeatmap from 'cal-heatmap';
import React, { useEffect, useRef } from 'react';

export function StreakCalendar() {
  // type is {currentStreak:number, calendar:[{key:string: count:number}
  const { data } = useSWRHelper<{currentStreak: number, calendar: {date: string, value: number}[]}>('/api/streak');

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
            type: 'linear',
            scheme: 'PRGn',
            domain: [0, 12],
          },
        },
        domain: {
          type: 'month',
        },

        subDomain: { type: 'day', radius: 6 },
        itemSelector: '#cal-heatmap',
      },

    );

    return () => {
      cal.destroy();
    };
  }, [data?.calendar]);

  return (<div className='flex flex-col gap-2 justify-center text-center'>
    <div className='p-1'>Play Streak: <span className='font-bold'>{data?.currentStreak} day{data?.currentStreak === 1 ? '' : 's'}</span>!</div>
    { /* put cal-heatmap within a horizontal scrollable div */}
    <div id='cal-heatmap' ref={heatmapRef} className='overflow-x-scroll justify-center flex' />
  </div>
  );
}
