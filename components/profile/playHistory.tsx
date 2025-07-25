import useSWRHelper from '@root/hooks/useSWRHelper';
import { EnrichedLevel } from '@root/models/db/level';
import PlayAttempt from '@root/models/db/playAttempt';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';
import { useEffect, useState } from 'react';
import LevelCard from '../cards/levelCard';
import LoadingSpinner from '../page/loadingSpinner';

dayjs.extend(duration);
dayjs.extend(utc);

export default function PlayHistory() {
  const [cursor, setCursor] = useState<string | null>();
  const [datetime, setDatetime] = useState<string | null>(null);
  const [filterSolved, setFilterSolved] = useState(false);
  const [minDurationMinutes, setMinDurationMinutes] = useState(0);

  const [accumulatedPlayHistory, setAccumulatedPlayHistory] = useState<PlayAttempt[]>([]);
  const [intermediateDate, setIntermediateDate] = useState(datetime);
  const [intermediateMinDuration, setIntermediateMinDuration] = useState(0);

  const queryParams = new URLSearchParams({
    ...(cursor && { cursor: cursor.toString() }),
    ...(datetime && { datetime: datetime.toString() }),
    filterSolved: filterSolved.toString(),
    minDurationMinutes: minDurationMinutes.toString(),
  });

  const { data: playHistory, isLoading } = useSWRHelper<PlayAttempt[]>(
    `/api/user/play-history?${queryParams}`,
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
    if (playHistory) {
      setAccumulatedPlayHistory(prev => [...prev, ...playHistory].filter((playAttempt, index, self) => {
        return index === self.findIndex((t) => (
          t._id?.toString() === playAttempt._id?.toString()
        ));
      }));
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const controls = (
    <div className='flex flex-wrap gap-y-4 gap-x-6 justify-center items-center'>
      <div className='flex flex-col items-start gap-1'>
        <label className='font-semibold'>Go to Date and Time</label>
        <input
          className='p-2 border border-color-4 rounded'
          min='2020-01-01T00:00'
          max={dayjs().format('YYYY-MM-DDTHH:mm')}
          onBlur={() => {
            // only query for new data if the date has changed
            if (intermediateDate !== datetime) {
              setAccumulatedPlayHistory([]);
              setCursor(null);
              setDatetime(intermediateDate);
            }
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => {
            setIntermediateDate(e.target.value);
          }}
          type='datetime-local'
          value={intermediateDate ? intermediateDate : dayjs().format('YYYY-MM-DDTHH:mm')}
        />
        {intermediateDate && (
          <button className='text-sm hover:underline'
            onClick={() => {
              if (intermediateDate) {
                setIntermediateDate(null);
                setDatetime(null);
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
        <label className='font-semibold truncate'>Minimum Duration</label>
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
        <label className='font-semibold truncate' htmlFor='solvedOnly'>Show Solved</label>
        <input
          checked={filterSolved}
          id='solvedOnly'
          onChange={() => {
            setAccumulatedPlayHistory([]);
            setCursor(null);
            setFilterSolved(!filterSolved);
          }}
          type='checkbox'
        />
      </div>
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
          {accumulatedPlayHistory.map(playAttempt => {
            const level = playAttempt.levelId as EnrichedLevel;
            let durationInbetween = null;

            if (prevEndTime) {
              durationInbetween = dayjs.duration(playAttempt.startTime - prevEndTime, 'seconds').humanize();
            }

            prevEndTime = playAttempt.endTime;

            const currentDate = dayjs.unix(playAttempt.startTime).local().format('MMMM DD, YYYY');
            const showDate = currentDate !== prevDate;

            prevDate = currentDate;

            return (
              <div
                className='flex flex-col gap-2'
                key={playAttempt._id.toString()}
              >
                {showDate ?
                  <span className='text-lg font-medium pt-4'>
                    {currentDate}
                  </span>
                  :
                  durationInbetween && <span className='px-1' style={{ color: 'var(--color-gray)' }}>{durationInbetween} later</span>
                }
                <div className='flex items-center gap-4'>
                  <div className='w-4 h-full flex justify-center relative'>
                    <div className='w-0.5 h-full rounded-full' style={{
                      backgroundColor: 'var(--bg-color-3)',
                    }} />
                  </div>
                  <div className='flex flex-col items-start gap-2'>
                    <span className='p-1 italic'>
                      {dayjs.unix(playAttempt.startTime).local().format('h:mma')} - Played for {dayjs.duration(playAttempt.endTime - playAttempt.startTime, 'seconds').humanize()} {playAttempt.attemptContext === AttemptContext.JUST_SOLVED && 'and solved'}
                    </span>
                    <LevelCard id='play-history' level={level} />
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading ?
            <LoadingSpinner />
            :
            <span className='text-lg text-center p-4'>
              {accumulatedPlayHistory.length > 0 ? 'No more history to display' : 'No history with these filters'}
            </span>
          }
        </div>
      </div>
    </div>
  );
}
