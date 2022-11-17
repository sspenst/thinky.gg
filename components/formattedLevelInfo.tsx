import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import { LevelContext } from '../contexts/levelContext';
import getFormattedDate from '../helpers/getFormattedDate';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import SelectOptionStats from '../models/selectOptionStats';
import { getFormattedDifficulty } from './difficultyDisplay';
import formattedAuthorNote from './formattedAuthorNote';
import FormattedUser from './formattedUser';

interface RecordDivProps {
  record: Record;
}

function RecordDiv({ record }: RecordDivProps) {
  return (
    <div className='flex gap-1.5 items-center'>
      <span className='font-bold'>{record.moves}</span>
      <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
      <span className='text-sm opacity-70'>{getFormattedDate(record.ts)}</span>
    </div>
  );
}

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [collapsedAuthorNote, setCollapsedAuthorNote] = useState(true);
  const [hideStats, setHideStats] = useState(true);
  const levelContext = useContext(LevelContext);

  const completionDivs = [];
  const maxCollapsedAuthorNote = 100;
  const recordDivs = [];
  const stat = new SelectOptionStats(level.leastMoves, level.userMoves);

  if (levelContext?.records) {
    for (let i = 0; i < levelContext.records.length; i++) {
      recordDivs.push(
        <RecordDiv
          key={`record-${levelContext.records[i]._id}`}
          record={levelContext.records[i]}
        />
      );
    }
  }

  if (levelContext?.completions) {
    for (let i = 0; i < levelContext.completions.length; i++) {
      completionDivs.push(
        <div className='flex gap-1.5 items-center' key={`completion-${levelContext.completions[i]._id}`}>
          <FormattedUser size={Dimensions.AvatarSizeSmall} user={levelContext.completions[i].userId} />
          <span className='text-sm opacity-70'>{getFormattedDate(levelContext.completions[i].ts)}</span>
        </div>
      );
    }
  }

  return (
    <div>
      <div className='font-bold text-2xl mb-1'>{level.name}</div>
      <div className='flex gap-2 items-center'>
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
        <span className='text-sm opacity-70'>{getFormattedDate(level.ts)}</span>
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
          <span className='text-sm opacity-70 ml-1.5'>
            {`${getFormattedDate(level.userMovesTs)}, ${level.userAttempts} attempt${level.userAttempts !== 1 ? 's' : ''}`}
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
      {!hideStats && <>
        <div className='mt-4'>
          <span className='font-bold'>Least moves history:</span>
          {!levelContext?.records ?
            <>
              <div><span>Loading...</span></div>
            </>
            :
            <>
              {recordDivs}
            </>
          }
        </div>
        <div className='mt-4'>
          <span className='font-bold'>{`Completed by ${level.calc_stats_players_beaten} user${level.calc_stats_players_beaten !== 1 ? 's' : ''}:`}</span>
          {!levelContext?.completions ?
            <>
              <div><span>Loading...</span></div>
            </>
            :
            <>
              {completionDivs}
              {level.calc_stats_players_beaten > 10 &&
                <div className='text-sm mt-1'>
                  ...and {level.calc_stats_players_beaten - 10} more
                </div>
              }
            </>
          }
        </div>
      </>}
      <button
        className='italic underline mt-4 block'
        onClick={() => setHideStats(s => !s)}
      >
        {`${hideStats ? 'Show' : 'Hide'} stats`}
      </button>
    </div>
  );
}
