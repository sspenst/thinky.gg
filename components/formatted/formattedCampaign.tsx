import Link from 'next/link';
import React, { useCallback } from 'react';
import { EnrichedCollection } from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import SelectOptionStats from '../../models/selectOptionStats';
import FilterButton from '../buttons/filterButton';
import LevelCard from '../cards/levelCard';

function getCompleteIcon(complete: boolean) {
  if (complete) {
    return (
      <div className='rounded-full bg-green-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
        </svg>
      </div>
    );
  } else {
    return (
      <div className='rounded-full bg-neutral-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M16 12H8' />
        </svg>
      </div>
    );
  }
}

interface FormattedCampaignProps {
  enrichedCollections: EnrichedCollection[];
  hideUnlockRequirements?: boolean;
  levelHrefQuery: string;
  nextHref?: string;
  nextTitle?: string;
  solvedElement: JSX.Element;
  solvedLevels: number;
  subtitle?: string;
  title: string;
  totalLevels: number;
}

export default function FormattedCampaign({
  enrichedCollections,
  hideUnlockRequirements,
  levelHrefQuery,
  nextHref,
  nextTitle,
  solvedElement,
  solvedLevels,
  subtitle,
  title,
  totalLevels,
}: FormattedCampaignProps) {
  const [filter, setFilter] = React.useState<string>('HIDE_SOLVED');

  const getLevelOptions = useCallback((enrichedCollection: EnrichedCollection) => {
    const levelOptions: JSX.Element[] = [];

    for (const level of enrichedCollection.levels as EnrichedLevel[]) {
      if (filter === 'HIDE_SOLVED' && level.userMoves === level.leastMoves) {
        continue;
      }

      levelOptions.push(
        <div className='flex items-center justify-center' key={`campaign-level-${level._id.toString()}`}>
          <LevelCard
            href={`/level/${level.slug}?cid=${enrichedCollection._id}&${levelHrefQuery}`}
            id='campaign'
            level={level}
          />
        </div>
      );
    }

    return levelOptions;
  }, [filter, levelHrefQuery]);

  const getOptions = useCallback(() => {
    const options: JSX.Element[] = [];
    let prevMajorCollection: EnrichedCollection | undefined = undefined;

    for (const enrichedCollection of enrichedCollections) {
      let lockedStr: string | undefined = undefined;

      if (prevMajorCollection) {
        const unlockPercent = enrichedCollection.unlockPercent ?? 50;
        const remainingLevels = Math.ceil(prevMajorCollection.levelCount * unlockPercent / 100) - prevMajorCollection.userSolvedCount;

        if (remainingLevels > 0) {
          lockedStr = `Solve ${remainingLevels} more level${remainingLevels === 1 ? '' : 's'} from ${prevMajorCollection.name}`;
        }
      }

      const stats = new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userSolvedCount);
      const levels = getLevelOptions(enrichedCollection);

      options.push(
        <div
          className='text-center flex flex-col gap-2'
          key={`collection-${enrichedCollection._id.toString()}`}
        >
          <div className='text-2xl font-bold'>
            {enrichedCollection.name}
          </div>
          {lockedStr ?
            <div className='italic text-center'>
              {lockedStr}
            </div>
            :
            <>
              <div className='text-lg font-bold mb-4' style={{
                color: stats.getColor(),
                textShadow: '1px 1px black',
              }}>
                {stats.getText()}
              </div>
              <div className='flex flex-wrap justify-center items-start gap-4'>
                {levels.length > 0 ? levels : <span className='italic'>You have solved all levels in this section!</span>}
              </div>
            </>
          }
        </div>
      );

      if (!enrichedCollection.isThemed) {
        prevMajorCollection = enrichedCollection;
      }
    }

    return options;
  }, [enrichedCollections, getLevelOptions]);

  const totalStats = new SelectOptionStats(totalLevels, solvedLevels);
  const remainingLevels = Math.ceil(totalLevels * 0.75) - solvedLevels;
  const isCampaignComplete = remainingLevels <= 0 && enrichedCollections.filter(c => !c.isThemed).every(c => Math.ceil(c.levelCount * 0.5) - c.userSolvedCount <= 0);

  return (<>
    <div className='flex flex-col justify-center items-center mt-4 mb-6 gap-2 mx-2'>
      <div className='font-bold text-3xl'>
        {title}
      </div>
      {subtitle && <div className='font-bold text-xl'>
        {subtitle}
      </div>}
      <div className='flex justify-center mt-2 w-full'>
        <div className='w-2/3 bg-neutral-600 h-2 rounded shadow-sm' style={{
          backgroundColor: 'var(--bg-color-3)',
        }}>
          <div className='h-full rounded' style={{
            backgroundColor: totalStats.getColor(),
            transition: 'width 0.5s ease',
            width: solvedLevels / totalLevels * 100 + '%',
          }} />
        </div>
      </div>
      <div className='text-lg font-bold flex justify-center' style={{
        color: totalStats.getColor(),
        textShadow: '1px 1px black',
      }}>
        {totalStats.getText()}
      </div>
      {solvedLevels === totalLevels && solvedElement}
      {isCampaignComplete && nextTitle && nextHref &&
        <Link className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mt-2 rounded focus:outline-none focus:shadow-outline cursor-pointer' href={nextHref}>
          {nextTitle}
        </Link>
      }
      {!hideUnlockRequirements &&
        <div className='align-left flex flex-col gap-1 italic mt-2'>
          <div className='flex flex-row gap-2 items-center'>
            {getCompleteIcon(remainingLevels <= 0)}
            <span>Solve 75% of {title}{remainingLevels > 0 ? ` (${remainingLevels} remaining)` : null}</span>
          </div>
          {enrichedCollections.filter(c => !c.isThemed).map(c => {
            const remainingLevels = Math.ceil(c.levelCount * 0.5) - c.userSolvedCount;

            return (
              <div className='flex flex-row gap-2 items-center' key={`unlock-requirement-${c._id.toString()}`}>
                {getCompleteIcon(remainingLevels <= 0)}
                <span>Solve 50% of {c.name}{remainingLevels > 0 ? ` (${remainingLevels} remaining)` : null}</span>
              </div>
            );
          })}
        </div>
      }
    </div>
    { solvedLevels > 0 &&
      <div className='flex text-center mb-6 items-center gap-2 flex-col'>
        <FilterButton
          element={<span className='text-base'>{filter === 'HIDE_SOLVED' ? 'Show All' : 'Hide Solved'}</span>}
          first
          last
          onClick={() => setFilter(filter === 'HIDE_SOLVED' ? 'SHOW_ALL' : 'HIDE_SOLVED')}
          selected={filter === 'HIDE_SOLVED'}
          value={filter}
        />
      </div>
    }
    <div className='flex flex-col gap-12'>
      {getOptions()}
    </div>
  </>);
}
