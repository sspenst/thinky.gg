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

export default function RecommendedLevel({ hrefOverride, id, level, onClick, title, tooltip }: RecommendedLevelProps): JSX.Element {
  return (
    <Card id={id} title={title} tooltip={tooltip}>
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
              href: hrefOverride || `/level/${level.slug}`,
              id: level._id.toString(),
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
