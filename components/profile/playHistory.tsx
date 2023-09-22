import Dimensions from '@root/constants/dimensions';
import isPro from '@root/helpers/isPro';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { EnrichedLevel } from '@root/models/db/level';
import PlayAttempt from '@root/models/db/playAttempt';
import User from '@root/models/db/user';
import SelectOptionStats from '@root/models/selectOptionStats';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import SelectCard from '../cards/selectCard';
import LoadingSpinner from '../page/loadingSpinner';

export default function ProfilePlayHistory({ user }: { user: User }): JSX.Element {
  const [selectedDate, setSelectedDate] = useState(null);
  const [minDurationMinutes, setMinDurationMinutes] = useState(0);

  const [cursor, setCursor] = useState<string | null>();
  const [accumulatedPlayHistory, setAccumulatedPlayHistory] = useState<PlayAttempt[]>([]);
  const [intermediateMinDuration, setIntermediateMinDuration] = useState(0);
  const [intermediateDate, setIntermediateDate] = useState(selectedDate);
  const [isMobile, setIsMobile] = useState(false);
  const params = { datetime: selectedDate, minDurationMinutes, cursor };
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const { data: playHistory, isLoading } = useSWRHelper<PlayAttempt[]>(
    `/api/user/play-history?${queryString}`,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    },
    !isPro(user)
  );

  let prevEndTime = 0;
  let prevDate: string | null = null;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    addEventListener('resize', () => {
      setIsMobile(window.innerWidth < 768);
    }, { passive: true });

    return () => {
      removeEventListener('resize', () => {
        setIsMobile(window.innerWidth < 768);
      });
    };
  }, []);
  useEffect(() => {
    if (playHistory) {
      setAccumulatedPlayHistory(prev => [...prev, ...playHistory].filter((playAttempt, index, self) => {
        return index === self.findIndex((t) => (
          t._id.toString() === playAttempt._id.toString()
        ));
      })
      );
    }
  }, [playHistory]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        // Reached bottom
        if (playHistory && playHistory.length > 0 && !isLoading) {
          setCursor(playHistory[playHistory.length - 1]._id.toString());
        }
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, playHistory]);

  const handleSliderChange = (e: any) => {
    const newValue = e.target.value;

    if (minDurationMinutes === intermediateMinDuration) {
      return;
    }

    setIntermediateMinDuration(newValue);
    setMinDurationMinutes(intermediateMinDuration);
    setAccumulatedPlayHistory([]); // Clear the play history
    setCursor(null); // Reset the cursor
  };

  const display = accumulatedPlayHistory && accumulatedPlayHistory.map((playAttempt, index) => {
    const level = playAttempt.levelId as EnrichedLevel;
    let durationInbetween = null;

    if (prevEndTime) {
      durationInbetween = moment.duration(playAttempt.startTime - prevEndTime, 'seconds').humanize();
    }

    prevEndTime = playAttempt.endTime;

    const currentDate = moment.unix(playAttempt.startTime).local().format('MMMM Do, YYYY');
    const showDate = currentDate !== prevDate;

    prevDate = currentDate;

    const isLeftAligned = false && index % 2 === 0;

    return (
      <div
        key={playAttempt._id.toString()}
        className='flex flex-col gap-2'
        style={{ position: 'relative' }}
      >
        {showDate && (
          <div className={'md:text-lg text-xs absolute top-50% transform -translate-y-1/2 text-gray-500 sm:left-[-10%] lg:left-[-50%]'}>

            {currentDate}
          </div>
        )}

        { durationInbetween && <span className='text-gray-500 dark:text-gray-400 justify-center self-center'>{durationInbetween} later</span> }
        <div className={`flex flex-row items-center relative ${isLeftAligned ? 'flex-row-reverse' : ''}`}>
          <div>
            <div style={{
              position: 'absolute',
              width: '2px',
              backgroundColor: '#ccc',
              top: 0,
              bottom: 0,
              left: '50%',
              transform: 'translate(-50%)',

              zIndex: 0,
            }} />
            <div style={{
              position: 'absolute',
              height: '10px',
              width: '10px',
              backgroundColor: '#ccc',
              borderRadius: '50%',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1
            }} />
          </div>
          <div className={`${isLeftAligned ? '' : 'mr-10'}`}>
            <SelectCard option={{
              author: level.userId?.name,
              height: Dimensions.OptionHeightLarge,
              href: `/level/${level.slug}`,
              id: playAttempt.levelId._id.toString() + '-' + playAttempt._id.toString(),
              level: level,
              stats: new SelectOptionStats(level.leastMoves, level.userMoves),
              text: level.name,
              width: Dimensions.OptionWidth * (isMobile ? 0.8 : 1),
            }} />
          </div>
          <div className={'flex flex-col ' + (isLeftAligned ? 'mr-5 items-end text-right' : 'ml-5 items-start')}>
            {moment.unix(playAttempt.startTime).local().format('h:mma')}
            <span>Played for {moment.duration(playAttempt.endTime - playAttempt.startTime, 'seconds').humanize()}</span>
          </div>
        </div>

      </div>
    );
  });

  const uxControls = (
    <div className='flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 p-4 justify-center items-center'>
      <div className='flex flex-col items-start'>
        <label className='text-lg font-semibold'>Go to Date and Time</label>
        <input
          type='datetime-local'
          min='2020-01-01T00:00'
          max={moment().format('YYYY-MM-DDTHH:mm')}
          value={intermediateDate ? intermediateDate : moment().format('YYYY-MM-DDTHH:mm')}
          onChange={(e: any) => {
            setIntermediateDate(e.target.value);
          }}
          onBlur={() => {
            setAccumulatedPlayHistory([]); // Clear the play history
            setCursor(null); // Reset the cursor
            setSelectedDate(intermediateDate);
          }}
          className='p-2 border rounded text-black'

        />
        { intermediateDate && (<button className='text-sm hover:underline'
          onClick={() => {
            if (intermediateDate) {
              setIntermediateDate(null);
              setSelectedDate(null);
              setAccumulatedPlayHistory([]); // Clear the play history
              setCursor(null); // Reset the cursor
            }
          }
          }>Reset</button>
        )}
      </div>

      <div className='flex flex-col items-start'>
        <label className='text-lg font-semibold'>Minimum Duration (minutes)</label>
        <input
          type='range'
          min='0'
          max='240'
          step={5}
          value={intermediateMinDuration}
          onChange={(value: any) => {
            setIntermediateMinDuration(value.target.value);
          }}
          onKeyUp={handleSliderChange}
          onMouseUp={handleSliderChange}
          onTouchEnd={handleSliderChange}

          className='cursor-pointer'
        />
        <span className='text-sm'>{intermediateMinDuration} minutes</span>
      </div>

    </div>
  );

  const nothingToDisplay = (
    <div className='flex flex-col items-center justify-center'>
      <h1 className='text-xl  mb-4'>No history with these filters</h1>
    </div>
  );

  return (
    <div>
      <div>
        <h1 className='text-center text-2xl font-bold mb-4'>
          {user.name} Play History
        </h1>
        <div>{uxControls}</div>
      </div>
      <div className='grid justify-center'>
        <div className='flex flex-col gap-3'>
          {(display.length > 0 ? display : (!isLoading ? nothingToDisplay : null))}
          { isLoading && <LoadingSpinner />}
        </div>
      </div>
    </div>
  );
}
