import { GameType } from '@root/constants/Games';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { EnrichedLevel } from '@root/models/db/level';
import React from 'react';
import StyledTooltip from '../page/styledTooltip';

const maxDiff = 30000;

interface Difficulty {
  description: string;
  emoji: string;
  name: string;
  // avg solve time
  value: number;
}

export enum DIFFICULTY_INDEX {
  PENDING = 0,
  KINDERGARTEN = 1,
  ELEMENTARY = 2,
  JUNIOR_HIGH = 3,
  HIGH_SCHOOL = 4,
  BACHELORS = 5,
  MASTERS = 6,
  PHD = 7,
  PROFESSOR = 8,
  GRANDMASTER = 9,
  SUPER_GRANDMASTER = 10,
}

export const difficultyList: Difficulty[] = [
  {
    description: 'Waiting for more plays',
    emoji: '⏳',
    name: 'Pending',
    value: -1,
  },
  {
    description: 'For new players',
    emoji: '🐥',
    name: 'Kindergarten',
    value: 0,
  },
  {
    description: 'Beginner',
    emoji: '✏️',
    name: 'Elementary',
    value: 45,
  },
  {
    description: 'Easy',
    emoji: '📝',
    name: 'Junior High',
    value: 120,
  },
  {
    description: 'Intermediate',
    emoji: '📚',
    name: 'Highschool',
    value: 300,
  },
  {
    description: 'Tricky',
    emoji: '🎓',
    name: 'Bachelors',
    value: 600,
  },
  {
    description: 'Difficult',
    emoji: '💉',
    name: 'Masters',
    value: 1200,
  },
  {
    description: 'Very difficult',
    emoji: '🔬',
    name: 'PhD',
    value: 3000,
  },
  {
    description: 'Extremely hard',
    emoji: '🧬',
    name: 'Professor',
    value: 6000,
  },
  {
    description: 'Insanely difficult',
    emoji: '📜',
    name: 'Grandmaster',
    value: 12000,
  },
  {
    description: 'Maximum difficulty',
    emoji: '🧠',
    name: 'Super Grandmaster',
    value: maxDiff,
  },
];

export function getDifficultyRangeByIndex(index: DIFFICULTY_INDEX) {
  const min = difficultyList[index].value;
  const max = difficultyList[index + 1]?.value || Number.MAX_SAFE_INTEGER;

  return [min, max];
}

export function getDifficultyRangeFromName(name: string) {
  for (let i = 0; i < difficultyList.length - 1; i++) {
    if (difficultyList[i].name === name) {
      return [difficultyList[i].value, difficultyList[i + 1].value];
    }
  }

  return [difficultyList[difficultyList.length - 1].value, Number.MAX_SAFE_INTEGER];
}

export function getDifficultyFromEstimate(estimate: number) {
  for (let i = difficultyList.length - 1; i >= 1; i--) {
    if (estimate >= difficultyList[i].value) {
      return difficultyList[i];
    }
  }

  return difficultyList[0];
}

/** function returns hsl */
export function getDifficultyColor(value: number, light = 50) {
  if (value === -1) {
    return 'hsl(0, 0%, 100%)';
  }

  // smallest difficulty estimate possible is 0, so need to add 1 to always get a positive number
  const perc = Math.log(value + 1) / Math.log(maxDiff + 1);
  const hue = 130 - perc * 120;
  const sat = 80 + perc * 30;

  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

interface FormattedDifficultyProps {
  difficulty?: Difficulty;
  difficultyField?: 'calc_difficulty_completion_estimate' | 'calc_difficulty_estimate';
  id: string;
  level?: EnrichedLevel;
  tooltip?: string;
}

export default function FormattedDifficulty({ difficulty, difficultyField, id, level, tooltip }: FormattedDifficultyProps) {
  let difficultyEstimate = difficulty?.value;

  let uniqueUsers: number | undefined = undefined;

  if (level) {
    const game = getGameFromId(level.gameId);
    const resolvedDifficultyField = difficultyField ?? (game.type === GameType.COMPLETE_AND_SHORTEST ? 'calc_difficulty_completion_estimate' : 'calc_difficulty_estimate');

    if (resolvedDifficultyField === 'calc_difficulty_completion_estimate') {
      difficultyEstimate = level.calc_difficulty_completion_estimate;

      if (level.calc_playattempts_unique_users_count_excluding_author !== undefined) {
        uniqueUsers = level.calc_playattempts_unique_users_count_excluding_author;
      } else {
        uniqueUsers = level.calc_playattempts_unique_users?.filter(userId => userId.toString() !== level.userId.toString() && userId.toString() !== level.userId?._id?.toString()).length;
      }
    } else {
      difficultyEstimate = level.calc_difficulty_estimate;

      if (level.calc_playattempts_unique_users_count !== undefined) {
        uniqueUsers = level.calc_playattempts_unique_users_count;
      } else {
        uniqueUsers = level.calc_playattempts_unique_users?.length;
      }
    }
  }

  // must provide one of difficulty or level props for FormattedDifficulty to return a value
  if (difficultyEstimate === undefined) {
    return null;
  }

  const color = getDifficultyColor(difficultyEstimate);
  const difficultyFromEstimate = getDifficultyFromEstimate(difficultyEstimate);
  let adjustedName = difficultyFromEstimate.name;
  //SGM+1 for 60k-120k, SGM+2 for 120k-240k, etc
  if (difficultyEstimate >= 2*maxDiff)
  {
     adjustedName += "+" + Math.floor(Math.log(difficultyEstimate/maxDiff)/Math.log(2));
  }
  const pendingRemainingUsers = 10 - (uniqueUsers ?? 0);
  const showPendingUsers = difficultyFromEstimate.name === 'Pending' && uniqueUsers !== undefined;
  const tooltipContent = tooltip ? tooltip : showPendingUsers ?
    `Waiting for ${pendingRemainingUsers} more player${pendingRemainingUsers === 1 ? '' : 's'}` :
    difficultyFromEstimate.description;

  return (
    <div className='flex justify-center difficultyText truncate'>
      <div className='truncate' data-tooltip-id={`difficulty-${id}`} data-tooltip-content={tooltipContent}>
        <span className='pr-1'>{difficultyFromEstimate.emoji}</span>
        <span className='italic pr-1' style={{
          color: color,
          textShadow: '1px 1px black',
        }}>
          {adjustedName}
          {showPendingUsers && ` (${pendingRemainingUsers})`}
        </span>
      </div>
      <StyledTooltip id={`difficulty-${id}`} />
    </div>
  );
}
