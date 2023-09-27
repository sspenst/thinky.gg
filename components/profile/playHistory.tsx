import Dimensions from '@root/constants/dimensions';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { EnrichedLevel } from '@root/models/db/level';
import PlayAttempt from '@root/models/db/playAttempt';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import SelectOptionStats from '@root/models/selectOptionStats';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import SelectCard from '../cards/selectCard';
import LoadingSpinner from '../page/loadingSpinner';

export default function ProfilePlayHistory() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [minDurationMinutes, setMinDurationMinutes] = useState(0);
  const [filterWon, setFilterWon] = useState(false);
  const [cursor, setCursor] = useState<string | null>();
  const [accumulatedPlayHistory, setAccumulatedPlayHistory] = useState<PlayAttempt[]>([]);
  const [intermediateMinDuration, setIntermediateMinDuration] = useState(0);
  const [intermediateDate, setIntermediateDate] = useState(selectedDate);
  const [isMobile, setIsMobile] = useState(false);
  const params = { datetime: selectedDate, minDurationMinutes, cursor, filterWon: (filterWon.toString()) };
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
    setAccumulatedPlayHistory([]);
    setCursor(null);
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

    return (
      <div
        key={playAttempt._id.toString()}
        className='flex flex-col gap-2'
      >
        {showDate ?
          <span className='text-lg font-medium pt-6' style={{ color: 'var(--color-gray)' }}>
            {currentDate}
          </span>
          :
          durationInbetween && <span className='text-center' style={{ color: 'var(--color-gray)' }}>{durationInbetween} earlier</span>
        }
        <div className='flex items-center relative'>
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
          <div className='mr-10'>
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
          <div className='flex flex-col ml-5 items-start'>
            {moment.unix(playAttempt.startTime).local().format('h:mma')}
            <span>Played for {moment.duration(playAttempt.endTime - playAttempt.startTime, 'seconds').humanize()} {playAttempt.attemptContext === AttemptContext.JUST_BEATEN && 'and won'}</span>
          </div>
        </div>

      </div>
    );
  });

  const controls = (
    <div className='flex flex-wrap gap-y-4 gap-x-6 justify-center items-center'>
      <div className='flex flex-col items-start gap-1'>
        <label className='font-semibold'>Go to Date and Time</label>
        <input
          className='p-2 border rounded text-black'
          min='2020-01-01T00:00'
          max={moment().format('YYYY-MM-DDTHH:mm')}
          onBlur={() => {
            setAccumulatedPlayHistory([]);
            setCursor(null);
            setSelectedDate(intermediateDate);
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => {
            setIntermediateDate(e.target.value);
          }}
          type='datetime-local'
          value={intermediateDate ? intermediateDate : moment().format('YYYY-MM-DDTHH:mm')}
        />
        {intermediateDate && (
          <button className='text-sm hover:underline'
            onClick={() => {
              if (intermediateDate) {
                setIntermediateDate(null);
                setSelectedDate(null);
                setAccumulatedPlayHistory([]);
                setCursor(null);
              }
            }}
          >
            Reset
          </button>
        )}
      </div>
      <div className='flex flex-col items-start gap-1'>
        <label className='text-md font-semibold truncate'>Minimum Duration</label>
        <div className='flex items-center gap-2'>
          <input
            className='cursor-pointer'
            max='240'
            min='0'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(value: any) => {
              setIntermediateMinDuration(value.target.value);
            }}
            onKeyUp={handleSliderChange}
            onMouseUp={handleSliderChange}
            onTouchEnd={handleSliderChange}
            step={5}
            type='range'
            value={intermediateMinDuration}
          />
          <span className='text-sm'>{intermediateMinDuration}m</span>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <label className='text-md font-semibold truncate' htmlFor='solvedOnly'>Solved Only</label>
        <input
          checked={filterWon}
          id='solvedOnly'
          onChange={() => {
            setAccumulatedPlayHistory([]);
            setCursor(null);
            setFilterWon(!filterWon);
          }}
          type='checkbox'
        />
      </div>
    </div>
  );

  const nothingToDisplay = (
    <div className='flex flex-col items-center justify-center'>
      <h1 className='text-xl  mb-4'>No history with these filters</h1>
    </div>
  );

  return (
    <div className='flex flex-col gap-4 p-4'>
      <h1 className='text-center text-2xl font-bold'>
        Play History
      </h1>
      {controls}
      <div className='flex justify-center'>
        <div className='flex flex-col gap-3'>
          {(display.length > 0 ? display : (!isLoading ? nothingToDisplay : null))}
          {isLoading && <LoadingSpinner />}
        </div>
      </div>
    </div>
  );
}
