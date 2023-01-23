import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import { LevelContext } from '../contexts/levelContext';
import { PageContext } from '../contexts/pageContext';
import getFormattedDate from '../helpers/getFormattedDate';
import { EnrichedLevel } from '../models/db/level';
import Stat from '../models/db/stat';
import SelectOptionStats from '../models/selectOptionStats';
import { getFormattedDifficulty } from './difficultyDisplay';
import formattedAuthorNote from './formattedAuthorNote';
import FormattedUser from './formattedUser';

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [allCompletions, setAllCompletions] = useState(false);
  const [collapsedAuthorNote, setCollapsedAuthorNote] = useState(true);
  const [hideStats, setHideStats] = useState(true);
  const levelContext = useContext(LevelContext);
  const { userConfig } = useContext(PageContext);

  const completionDivs = [];
  const maxCollapsedAuthorNote = 100;
  const recordDivs = [];
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);
  let showMedals = false;

  if (levelContext?.records && levelContext.records.length > 0) {
    if (levelContext?.completions) {
      if (levelContext.completions[levelContext.completions.length - 1].userId._id === levelContext.records[0].userId._id) {
        // confirmed we have all the completions and know where the medals should be given
        showMedals = true;
      }

      for (let i = 0; i < levelContext.completions.length; i++) {
        const stat = levelContext.completions[i] as Stat;

        if (levelContext.records[0].userId._id === stat.userId._id) {
          continue;
        }

        completionDivs.push(
          <div className='flex gap-1.5 items-center' key={`completion-${stat._id}`}>
            <span className='w-11 font-bold text-right'>{stat.moves}</span>
            {!hideStats && showMedals && <span className='w-4'>{i === levelContext.completions.length - 2 && '🥈'}{i === levelContext.completions.length - 3 && '🥉'}</span>}
            <FormattedUser size={Dimensions.AvatarSizeSmall} user={stat.userId} />
            <span className='text-sm' style={{
              color: 'var(--color-gray)',
            }}>{getFormattedDate(stat.ts)}</span>
          </div>
        );
      }
    }

    for (let i = 0; i < (hideStats ? 1 : levelContext.records.length); i++) {
      const record = levelContext.records[i];

      recordDivs.push(
        <div
          className='flex gap-1.5 items-center'
          key={`record-${record._id}`}
        >
          <span className='font-bold w-11 text-right'>{record.moves}</span>
          {!hideStats && showMedals && <span className='w-4'>{i === 0 && '🥇'}</span>}
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
          <span className='text-sm' style={{
            color: 'var(--color-gray)',
          }}>{getFormattedDate(record.ts)}</span>
        </div>
      );
    }
  }

  return (<>
    <div className='mb-4'>
      <div className='font-bold text-2xl mb-1'>{level.name}</div>
      <div className='flex gap-2 items-center'>
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
        <span className='text-sm' style={{
          color: 'var(--color-gray)',
        }}>{getFormattedDate(level.ts)}</span>
      </div>
      <div className='text-sm mt-1 flex gap-2 items-center'>
        {getFormattedDifficulty(level.calc_difficulty_estimate, level.calc_playattempts_unique_users_count)}
        <button
          className='italic underline'
          onClick={() => {
            navigator.clipboard.writeText(level.data);
            toast.success('Copied to clipboard');
          }}
        >
          Copy level data
        </button>
      </div>
      {level.userMoves && level.userMovesTs && level.userAttempts && (
        <div className='mt-4'>
          <span className='font-bold' style={{
            color: stat.getColor(),
            textShadow: '1px 1px black',
          }}>
            {stat.getText()}
          </span>
          <span className='text-sm ml-1.5' style={{
            color: 'var(--color-gray)',
          }}>
            {`${getFormattedDate(level.userMovesTs)}${userConfig?.showPlayStats ? `, ${level.userAttempts} attempt${level.userAttempts !== 1 ? 's' : ''}` : ''}`}
          </span>
        </div>
      )}
      {!level.authorNote ? null :
        <>
          <div className='mt-4'>
            {formattedAuthorNote(level.authorNote.length > maxCollapsedAuthorNote && collapsedAuthorNote ? `${level.authorNote.slice(0, maxCollapsedAuthorNote)}...` : level.authorNote)}
          </div>
          {level.authorNote.length <= maxCollapsedAuthorNote ? null :
            <button
              className='italic underline'
              onClick={() => setCollapsedAuthorNote(c => !c)}
            >
              {`Show ${collapsedAuthorNote ? 'more' : 'less'}`}
            </button>
          }
        </>
      }
      <div className='mt-4'>
        <span className='font-bold'>Least steps history:</span>
        {!levelContext?.records ?
          <>
            <div><span>Loading...</span></div>
          </>
          :
          <>
            {!hideStats && completionDivs}
            {!hideStats && !showMedals && !allCompletions &&
              <div className='flex text-sm items-center m-1 gap-2 ml-12'>
                {showMedals && <span className='w-4' />}
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z' />
                </svg>
                <button className='italic underline' onClick={() => {
                  levelContext?.getCompletions(!allCompletions);
                  setAllCompletions(c => !c);
                }}>
                  show more users
                </button>
              </div>
            }
            {recordDivs}
          </>
        }
        <button
          className='italic underline block'
          onClick={() => setHideStats(s => !s)}
        >
          {`Show ${hideStats ? 'more' : 'less'}`}
        </button>
      </div>
    </div>
    {level.archivedBy && <>
      <div className='m-3' style={{
        backgroundColor: 'var(--bg-color-4)',
        height: 1,
      }} />
      <div className='flex flex-row gap-2 items-center'>
        <span className='font-bold'>Archived by:</span>
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.archivedBy} />
        {level.archivedTs &&
          <span className='text-sm' style={{ color: 'var(--color-gray)' }}>
            {getFormattedDate(level.archivedTs)}
          </span>
        }
      </div>
    </>}
  </>);
}
