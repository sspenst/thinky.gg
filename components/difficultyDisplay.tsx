import React from 'react';
import { EnrichedLevel } from '../models/db/level';

const maxDiff = 19200;

export function getDifficultyList() {
  return [
    [0, 'Kindergarten', '🐥', 'For brand new players'],
    [60, 'Elementary', '✏️', 'Very easy level'],
    [120, 'Junior High', '📝', 'Easy level'],
    [300, 'Highschool', '📚', 'For advanced beginners - can get tricky'],
    [600, 'Bachelors', '🎓', 'Medium difficulty'],
    [1200, 'Masters', '💉', 'Difficult level targeted for intermediate players'],
    [2400, 'PhD', '🔬', 'Hard level that is for advanced players'],
    [4800, 'Professor', '🧬', 'Very hard. Challenges even the best players'],
    [9600, 'Grandmaster', '📜', 'Insane difficulty'],
    [maxDiff, 'Super Grandmaster', '🧠', 'One of the hardest levels in the game']
  ];
}

export function getDifficultyRangeFromName(value: string) {
  const difficultyList = getDifficultyList();

  for (let i = 1; i < difficultyList.length - 1; i++) {
    if (difficultyList[i][1] === value) {
      return [difficultyList[i][0], difficultyList[i + 1][0]];
    }
  }

  return [difficultyList[difficultyList.length - 1][0], 999999999];
}

export function getDifficultyFromValue(value: number) {
  const difficultyList = getDifficultyList();

  for (let i = 0; i < difficultyList.length; i++) {
    if (value < difficultyList[i][0]) {
      return difficultyList[i - 1];
    }
  }

  return difficultyList[difficultyList.length - 1];
}

/** function returns hsl */
export function getDifficultyColor(value: number) {
  const perc = Math.log(value + 0) / Math.log(maxDiff);

  const opacity = '20%';

  const hue = 120 - perc * 90;

  return `hsla(${hue}, 100%, 50%, ${opacity})`;
}

export function getFormattedDifficulty(level?: EnrichedLevel): JSX.Element | null {
  if (!level) {
    return <></>;
  }

  const value = level.difficultyEstimate;

  if (!value) {
    return <div className='italic text-sm pt-1 qtip' data-tooltip='Waiting for more plays'>Pending*</div>;
  }

  const [, label, icon, tip] = getDifficultyFromValue(value);

  const color = getDifficultyColor(value);

  return (
    <div className='pt-1'>
      <span className='p-1 italic rounded-lg qtip' data-tooltip={tip} style={{
        backgroundColor: color,
        // color should be black if the background is light and white if the background is dark

      }}>{label}
        <span className='text-md pl-1'>{icon}</span>
      </span>
    </div>
  );
}
