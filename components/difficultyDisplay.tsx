import React from 'react';
import Level from '../models/db/level';

const maxDiff = 19200;

interface Difficulty {
  description: string;
  emoji: string;
  name: string;
  // avg solve time
  value: number;
}

export function getDifficultyList() {
  return [
    {
      description: 'For new players',
      emoji: '🐥',
      name: 'Kindergarten',
      value: 1,
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
      value: 2400,
    },
    {
      description: 'Extremely hard - challenges even the best players',
      emoji: '🧬',
      name: 'Professor',
      value: 4800,
    },
    {
      description: 'Insanely difficult',
      emoji: '📜',
      name: 'Grandmaster',
      value: 9600,
    },
    {
      description: 'One of the hardest levels in the game',
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

  return [difficultyList[difficultyList.length - 1].value, 999999999];
}

export function getDifficultyFromValue(value: number) {
  const difficultyList = getDifficultyList();

  for (let i = difficultyList.length - 1; i >= 0; i--) {
    if (value >= difficultyList[i].value) {
      return difficultyList[i];
    }
  }

  return {
    description: 'Waiting for more plays',
    emoji: '⏳',
    name: 'Pending',
  } as Difficulty;
}

/** function returns hsl */
export function getDifficultyColor(value: number, light = 50) {
  if (value < 1) {
    return 'hsl(0, 0%, 100%)';
  }

  const perc = Math.log(value) / Math.log(maxDiff);
  const hue = 130 - perc * 120;
  const sat = 80 + perc * 30;

  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function getFormattedDifficulty(level?: Level): JSX.Element | null {
  if (!level) {
    return null;
  }

  const difficulty = getDifficultyFromValue(level.calc_difficulty_estimate);
  const color = getDifficultyColor(level.calc_difficulty_estimate);

  return (
    <div className='flex justify-center'>
      <div className='qtip' data-tooltip={difficulty.description}>
        <span className='italic pr-1' style={{
          color: color,
          textShadow: '1px 1px black',
        }}>
          {difficulty.name}
        </span>
        <span className='text-md pl-1'>{difficulty.emoji}</span>
      </div>
    </div>
  );
}
