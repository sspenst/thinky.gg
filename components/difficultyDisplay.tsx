import React from 'react';
import { EnrichedLevel } from '../models/db/level';

export function getFormattedDifficulty(level?: EnrichedLevel): JSX.Element | null {
  if (!level) {
    return <></>;
  }

  const value = level.difficultyEstimate;

  if (!value) {
    return <div className='italic text-sm pt-1 qtip' data-tooltip='Waiting for more plays'>Pending*</div>;
  }

  const maxDiff = 16200;
  const difficultyMap: Record<number, string> = {
    0: 'Kindergarten|🐥|For brand new players', // 0-60 seconds average completion
    60: 'Elementary|✏️|Very easy level', // 1-2 minutes average completion
    120: 'Junior High|📝|Easy level', // 2-5 minutes average completion
    300: 'Highschool|📚|For advanced beginners - can get tricky', // 5-10 minutes average completion
    600: 'Bachelors|🎓|Medium difficulty', // 10-20 minutes average completion
    1200: 'Masters|💉|Difficult level targeted for intermediate players', // 20-40 minutes average completion
    2400: 'PhD|🔬|Hard level that is for advanced players', // 40-80 minutes average completion
    4800: 'Professor|🧬|Very hard. Challenges even the best players', // 1-2 hours average completion
    9600: 'Grandmaster|📜|Insane difficulty', // 2-4 hours average completion
    16200: 'Super Grandmaster|🪬|The hardest category of levels' // 4+ hours average completion
  };
  let label = 'Unknown';
  let icon = '❓';
  let tip = '';

  // set label to the highest difficulty that is lower than the value
  for (const key in difficultyMap) {
    if (value < parseInt(key)) {
      break;
    }

    // split emoji from label
    [label, icon, tip] = difficultyMap[key].split('|');
  }

  const perc = value / maxDiff;

  // 0% should be green and 100% should be dark red
  const hue = 120 * (1 - perc);
  const color = `hsl(${hue}, 100%, 50%,20%)`;

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
