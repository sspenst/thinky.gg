import React from 'react';
import Dimensions from '../../constants/dimensions';
import { EnrichedLevel } from '../../models/db/level';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Card from '../cards/card';
import LoadingCard from '../cards/loadingCard';
import SelectCard from '../cards/selectCard';

interface RecommendedLevelProps {
  hrefOverride?: string;
  id: string;
  level?: EnrichedLevel | null;
  onClick?: (option: SelectOption) => void;
  title: React.ReactNode;
  tooltip?: string;
}

export default function RecommendedLevel({ hrefOverride, id, level, onClick, title, tooltip }: RecommendedLevelProps) {
  if (level === null) {
    return null;
  }

  return (
    <Card id={id} title={title} tooltip={tooltip}>
      {!level ? <LoadingCard /> :
        <SelectCard
          option={{
            author: level.userId?.name,
            height: Dimensions.OptionHeightLarge,
            href: hrefOverride || `/level/${level.slug}`,
            id: `${id}-${level._id.toString()}`,
            level: level,
            onClick: onClick,
            stats: new SelectOptionStats(level.leastMoves, level.userMoves),
            text: level.name,
          } as SelectOption}
        />
      }
    </Card>
  );
}
