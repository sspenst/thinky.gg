import React from 'react';
import Dimensions from '../../constants/dimensions';
import { EnrichedLevel } from '../../models/db/level';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import LoadingCard from '../cards/loadingCard';
import SelectCard from '../cards/selectCard';
import StyledTooltip from '../page/styledTooltip';

interface RecommendedLevelProps {
  id?: string;
  level?: EnrichedLevel | null;
  title: JSX.Element | string;
  tooltip?: string;
}

export default function RecommendedLevel({ id, level, title, tooltip }: RecommendedLevelProps): JSX.Element {
  return (
    <div className='flex flex-col justify-center rounded-lg border'
      id={id}
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <h2 className='self-center px-4 pt-3 text-lg font-bold'>
        {tooltip && <span className='w-20 text-center hover:underline hover:decoration-dashed cursor-help' data-tooltip-id={id + '-tooltip'} data-tooltip-content={tooltip}>{title}</span>}
        <StyledTooltip id={id + '-tooltip'} />
      </h2>
      {level === undefined ? <LoadingCard /> :
        !level ?
          <SelectCard
            option={{
              height: Dimensions.OptionHeightLarge,
              text: 'No level found!',
            } as SelectOption}
          />
          :
          <SelectCard
            option={{
              author: level.userId?.name,
              height: Dimensions.OptionHeightLarge,
              href: `/level/${level.slug}`,
              id: level._id.toString(),
              level: level,
              stats: new SelectOptionStats(level.leastMoves, level.userMoves),
              text: level.name,
            } as SelectOption}
          />
      }
    </div>
  );
}
