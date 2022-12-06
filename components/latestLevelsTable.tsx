import React from 'react';
import Dimensions from '../constants/dimensions';
import { EnrichedLevel } from '../models/db/level';
import SelectOption from '../models/selectOption';
import SelectOptionStats from '../models/selectOptionStats';
import Select from './select';

interface LatestLevelsTableProps {
  levels: EnrichedLevel[];
}

export default function LatestLevelsTable({ levels }: LatestLevelsTableProps) {
  return (
    <Select options={levels.map(level => {
      return {
        author: level.userId.name,
        height: Dimensions.OptionHeightLarge,
        href: `/level/${level.slug}`,
        id: level._id.toString(),
        level: level,
        stats: new SelectOptionStats(level.leastMoves, level.userMoves),
        text: level.name,
      } as SelectOption;
    })} />
  );
}
