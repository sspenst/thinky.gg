import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../constants/dimensions';
import { LevelContext } from '../contexts/levelContext';
import getFormattedDate from '../helpers/getFormattedDate';
import { EnrichedLevel } from '../models/db/level';
import Record from '../models/db/record';
import FormattedUser from './formattedUser';

interface RecordDivProps {
  record: Record;
}

function RecordDiv({ record }: RecordDivProps) {
  return (
    <div className='flex gap-1'>
      <span className='font-bold'>{record.moves}</span>
      <span>by</span>
      <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
      <span> - {getFormattedDate(record.ts)}</span>
    </div>
  );
}

interface FormattedLevelInfoProps {
  level: EnrichedLevel;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [collapsedRecords, setCollapsedRecords] = useState(true);
  const levelContext = useContext(LevelContext);

  const maxCollapsedRecords = 3;
  const recordDivs = [];

  if (levelContext?.records) {
    const numRecords = collapsedRecords ?
      Math.min(maxCollapsedRecords, levelContext.records.length) :
      levelContext.records.length;

    for (let i = 0; i < numRecords; i++) {
      recordDivs.push(
        <RecordDiv
          key={`record-${levelContext.records[i]._id}`}
          record={levelContext.records[i]}
        />
      );
    }
  }

  return (
    <div>
      <div className='font-bold text-2xl mb-1'>{level.name}</div>
      <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
      <div className='text-sm mt-1'>
        <span className='italic'>{getFormattedDate(level.ts)}</span>
        {' - '}
        <span className='font-bold'>Difficulty:</span> {level.points}
      </div>
      <button
        className='italic underline'
        onClick={() => {
          navigator.clipboard.writeText(level.data);
          toast.success('Copied to clipboard');
        }}
      >
        Copy level data to clipboard
      </button>
      {level.userMoves && level.userMovesTs && level.userAttempts && (
        <div className='mt-4'>
          <span className='font-bold'>Your least moves:</span> {level.userMoves}
          <br />
          <span className='font-bold'>Achieved:</span> {getFormattedDate(level.userMovesTs)}
          <br />
          <span className='font-bold'>Your attempts:</span> {level.userAttempts}
        </div>
      )
      }
      <div className='mt-4'>
        <span className='font-bold'>Least moves history:</span>
        {!levelContext?.records ?
          <>
            <div><span>Loading...</span></div>
          </>
          :
          <>
            {recordDivs}
            {levelContext.records.length <= maxCollapsedRecords ? null :
              <button
                className='italic underline'
                onClick={() => setCollapsedRecords(prevShowMore => !prevShowMore)}
              >
                {`Show ${collapsedRecords ? 'more' : 'less'}`}
              </button>
            }
          </>
        }
      </div>
    </div>
  );
}
