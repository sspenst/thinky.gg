import React, { useCallback } from 'react';
import Dimensions from '../constants/dimensions';
import { EnrichedCollection } from '../models/db/collection';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import SelectCard from './selectCard';

interface FormattedCampaignProps {
  completedElement: JSX.Element;
  completedLevels: number;
  enrichedCollections: EnrichedCollection[];
  subtitle?: string;
  title: string;
  totalLevels: number;
}

export default function FormattedCampaign({
  completedElement,
  completedLevels,
  enrichedCollections,
  subtitle,
  title,
  totalLevels,
}: FormattedCampaignProps) {
  const getLevelOptions = useCallback((enrichedCollection: EnrichedCollection) => {
    const levelOptions: JSX.Element[] = [];
    let disabled = false;

    for (const level of enrichedCollection.levels as EnrichedLevel[]) {
      levelOptions.push(
        <div className='flex flex-col w-60' key={`collection-${level._id.toString()}`}>
          <div className='flex items-center justify-center'>
            <SelectCard
              option={{
                author: level.userId.name,
                disabled: disabled,
                height: Dimensions.OptionHeightMedium,
                hideDifficulty: true,
                href: `/level/${level.slug}?cid=${enrichedCollection._id}&play=true`,
                id: level._id.toString(),
                level: level,
                stats: new SelectOptionStats(level.leastMoves, level.userMoves),
                text: level.name,
              } as SelectOption}
            />
          </div>
          {disabled &&
            <div className='px-4 italic text-center'>
              {'Requires completing the previous level'}
            </div>
          }
        </div>
      );

      // in a themed collection, levels must be completed sequentially
      if (enrichedCollection.isThemed && level.userMoves !== level.leastMoves) {
        disabled = true;
      }
    }

    return levelOptions;
  }, []);

  const getOptions = useCallback(() => {
    const options: JSX.Element[] = [];
    let disabled = false;

    for (let i = 0; i < enrichedCollections.length; i++) {
      const enrichedCollection = enrichedCollections[i];
      const levelUnlockRequirement = Math.ceil(enrichedCollection.levelCount / 2);
      const stats = new SelectOptionStats(enrichedCollection.levelCount, enrichedCollection.userCompletedCount);

      options.push(
        <div
          className='text-center mt-2 mb-4'
          key={`collection-${enrichedCollection._id.toString()}`}
        >
          <div className='text-2xl font-bold mb-1'>
            {enrichedCollection.name}
          </div>
          {disabled ?
            <div className='italic text-center'>
              {`Requires completing ${levelUnlockRequirement} level${levelUnlockRequirement === 1 ? '' : 's'} from ${enrichedCollections[i - 1].name}`}
            </div>
            :
            <>
              <div className='text-lg font-bold' style={{
                color: stats.getColor(),
                textShadow: '1px 1px black',
              }}>
                {stats.getText()}
              </div>
              <div className='flex flex-wrap justify-center'>
                {getLevelOptions(enrichedCollection)}
              </div>
            </>
          }
        </div>
      );

      // must beat at least 50% to unlock the next set
      // TODO: account for themed sets
      if (enrichedCollection.userCompletedCount < levelUnlockRequirement) {
        disabled = true;
      }
    }

    return options;
  }, [enrichedCollections, getLevelOptions]);

  const totalStats = new SelectOptionStats(totalLevels, completedLevels);

  return (<>
    <div className='mt-4 mb-6'>
      <div className='flex justify-center font-bold text-3xl text-center'>
        {title}
      </div>
      {subtitle && <div className='flex justify-center mt-2 font-bold text-xl text-center'>
        {subtitle}
      </div>}
      <div className='flex justify-center mt-4'>
        <div className='w-2/3 bg-neutral-600 h-2 mb-2 rounded shadow-sm' style={{
          backgroundColor: 'var(--bg-color-3)',
        }}>
          <div className='h-full rounded' style={{
            backgroundColor: totalStats.getColor(),
            transition: 'width 0.5s ease',
            width: completedLevels / totalLevels * 100 + '%',
          }} />
        </div>
      </div>
      <div className='text-lg font-bold flex justify-center' style={{
        color: totalStats.getColor(),
        textShadow: '1px 1px black',
      }}>
        {totalStats.getText()}
      </div>
      {completedLevels === totalLevels && completedElement}
    </div>
    <div>
      {getOptions()}
    </div>
  </>);
}
