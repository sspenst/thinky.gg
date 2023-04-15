import React from 'react';
import StyledTooltip from './styledTooltip';

const maxDiff = 30000;

interface Difficulty {
  description: string;
  emoji: string;
  name: string;
  // avg solve time
  value: number;
}

export enum DIFFICULTY_NAMES {
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

export function getDifficultyRangeFromDifficultyName(name: DIFFICULTY_NAMES) {
  const difficultyList = getDifficultyList();
  const min = difficultyList[name].value;
  const max = difficultyList[name + 1]?.value || Number.MAX_SAFE_INTEGER;

  return [min, max];
}

export function getDifficultyList() {
  return [
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
      description: 'Beginner level',
      emoji: '✏️',
      name: 'Elementary',
      value: 45,
    },
    {
      description: 'Easy level',
      emoji: '📝',
      name: 'Junior High',
      value: 120,
    },
    {
      description: 'Intermediate level',
      emoji: '📚',
      name: 'Highschool',
      value: 300,
    },
    {
      description: 'Tricky level',
      emoji: '🎓',
      name: 'Bachelors',
      value: 600,
    },
    {
      description: 'Difficult level',
      emoji: '💉',
      name: 'Masters',
      value: 1200,
    },
    {
      description: 'Very difficult level',
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
  ] as Difficulty[];
}

export function getDifficultyRangeFromName(name: string) {
  const difficultyList = getDifficultyList();

  for (let i = 0; i < difficultyList.length - 1; i++) {
    if (difficultyList[i].name === name) {
      return [difficultyList[i].value, difficultyList[i + 1].value];
    }
  }

  return [difficultyList[difficultyList.length - 1].value, Number.MAX_SAFE_INTEGER];
}

export function getDifficultyFromValue(value: number) {
  const difficultyList = getDifficultyList();

  for (let i = difficultyList.length - 1; i >= 1; i--) {
    if (value >= difficultyList[i].value) {
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

export function getFormattedDifficulty(difficultyEstimate: number, id: string, uniqueUsers?: number) {
  const color = getDifficultyColor(difficultyEstimate);
  const difficulty = getDifficultyFromValue(difficultyEstimate);
  const pendingRemainingUsers = 10 - (uniqueUsers ?? 0);
  const showPendingUsers = difficulty.name === 'Pending' && uniqueUsers !== undefined;
  const tooltip = showPendingUsers ?
    `Waiting for ${pendingRemainingUsers} more player${pendingRemainingUsers === 1 ? '' : 's'}` :
    difficulty.description;

  return (
    <div className='flex justify-center difficultyText'>
      <div data-tooltip-id={`difficulty-${id}`} data-tooltip-content={tooltip}>
        <span className='text-md pr-1'>{difficulty.emoji}</span>
        <span className='italic pr-1' style={{
          color: color,
          textShadow: '1px 1px black',
        }}>
          {difficulty.name}
          {showPendingUsers && ` (${pendingRemainingUsers})`}
        </span>
      </div>
      <StyledTooltip id={`difficulty-${id}`} />
    </div>
  );
}
