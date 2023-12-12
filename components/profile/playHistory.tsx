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
          t._id.toString() === playAttempt._id.toString()
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
          className='p-2 border rounded'
          min='2020-01-01T00:00'
          max={moment().format('YYYY-MM-DDTHH:mm')}
          onBlur={() => {
            setAccumulatedPlayHistory([]);
            setCursor(null);
            setDatetime(intermediateDate);
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
        <label className='font-semibold truncate' htmlFor='solvedOnly'>Solved Only</label>
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
              durationInbetween = moment.duration(playAttempt.startTime - prevEndTime, 'seconds').humanize();
            }

            prevEndTime = playAttempt.endTime;

            const currentDate = moment.unix(playAttempt.startTime).local().format('MMMM Do, YYYY');
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
                      backgroundColor: 'var(--color-gray)',
                    }} />
                  </div>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center'>
                    <SelectCard option={{
                      author: level.userId?.name,
                      height: Dimensions.OptionHeightLarge,
                      href: `/level/${level.slug}`,
                      id: playAttempt.levelId._id.toString() + '-' + playAttempt._id.toString(),
                      level: level,
                      searchLabel: level.name,
                      stats: new SelectOptionStats(level.leastMoves, level.userMoves),
                      text: level.name,
                    }} />
                    <span className='px-3 py-1'>
                      {moment.unix(playAttempt.startTime).local().format('h:mma')}
                      <br />
                      Played for {moment.duration(playAttempt.endTime - playAttempt.startTime, 'seconds').humanize()} {playAttempt.attemptContext === AttemptContext.JUST_SOLVED && 'and solved'}
                    </span>
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
