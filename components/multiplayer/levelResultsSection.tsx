import LevelCard from '@root/components/cards/levelCard';
import FormattedUser from '@root/components/formatted/formattedUser';
import StyledTooltip from '@root/components/page/styledTooltip';
import Dimensions from '@root/constants/dimensions';
import { MatchAction, MatchLogDataLevelComplete } from '@root/models/constants/multiplayer';
import Level from '@root/models/db/level';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import dayjs from 'dayjs';
import React from 'react';

interface LevelResultsSectionProps {
  match: MultiplayerMatch;
}

function getLevelResultIcon(match: MultiplayerMatch, level: Level, userId: string) {
  if (!match?.matchLog) {
    return;
  }

  const completedLog = match.matchLog.filter(log => log.type === MatchAction.COMPLETE_LEVEL && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString() && (log.data as MatchLogDataLevelComplete).userId.toString() === userId);

  if (completedLog.length !== 0) {
    const timestamp = new Date(completedLog[0].createdAt).getTime() - new Date(match.startTime).getTime();

    return (<>
      <div className='rounded-full bg-green-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
        </svg>
      </div>
      <div className='text-xs w-8 justify-center flex'>
        {`+${dayjs(timestamp).format('m:ss')}`}
      </div>
    </>);
  }

  const skippedLog = match.matchLog.filter(log => log.type === MatchAction.SKIP_LEVEL && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString() && (log.data as MatchLogDataLevelComplete).userId.toString() === userId);

  if (skippedLog.length !== 0) {
    const timestamp = new Date(skippedLog[0].createdAt).getTime() - new Date(match.startTime).getTime();

    return (<>
      <div data-tooltip-id='skipped' data-tooltip-content={'Skipped'} className='rounded-full bg-blue-500 border' style={{
        borderColor: 'var(--bg-color-4)',
      }}>
        <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' className='w-6 h-6 bi bi-arrow-right-short' viewBox='0 0 16 16'>
          <path fillRule='evenodd' d='M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z' />
        </svg>
      </div>
      <StyledTooltip id='skipped' />
      <div className='text-xs w-8 justify-center flex'>
        {`+${dayjs(timestamp).format('m:ss')}`}
      </div>
    </>);
  }

  return (<>
    <div className='rounded-full bg-neutral-500 border' style={{
      borderColor: 'var(--bg-color-4)',
    }}>
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M16 12H8' />
      </svg>
    </div>
    <div className='text-xs w-8 justify-center flex' style={{ minWidth: 32 }}>
      {'-'}
    </div>
  </>);
}

export default function LevelResultsSection({ match }: LevelResultsSectionProps) {
  const levelResults = [];

  for (let i = 0; i < match.levels.length; i++) {
    const level = match.levels[i] as Level;

    if (!level) {
      continue;
    }

    levelResults.push(
      <div className='flex justify-center items-center flex-wrap gap-2' key={`level-result-${level._id.toString()}`}>
        <div className='flex flex-row items-center gap-4'>
          <div className='text-2xl font-bold w-10 text-right'>
            {i + 1}.
          </div>
          <LevelCard
            id='match'
            level={level}
          />
        </div>
        <div className='flex flex-col gap-2 justify-left truncate'>
          {match.players.map(player => (
            <div className='flex flex-row gap-2 items-center' key={player._id.toString()}>
              {getLevelResultIcon(match, level, player._id.toString())}
              <FormattedUser id={`match-level-${i}`} size={Dimensions.AvatarSizeSmall} user={player} />
            </div>
          ))}
        </div>
      </div>
    );

    // show the last level seen by either user then break
    if (!match.matchLog?.some(log => (log.type === MatchAction.COMPLETE_LEVEL || log.type === MatchAction.SKIP_LEVEL) && (log.data as MatchLogDataLevelComplete).levelId.toString() === level._id.toString())) {
      break;
    }
  }

  // Don't render anything if there are no level results
  if (levelResults.length === 0) {
    return null;
  }

  return (
    <div className='w-full max-w-4xl'>
      <h2 className='text-2xl font-bold text-center mb-6'>
        <span className='bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>
          Level Breakdown
        </span>
      </h2>
      <div className='flex flex-col gap-6'>
        {levelResults.reverse().map((result, index) => (
          <div key={index} className='relative animate-fadeInUp' style={{ animationDelay: `${index * 0.1}s` }}>
            <div className='absolute -inset-2 bg-linear-to-r from-purple-600/15 to-pink-600/15 blur-lg opacity-40' />
            <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
              {result}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
