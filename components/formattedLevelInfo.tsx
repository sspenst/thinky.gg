import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { LevelContext } from '../contexts/levelContext';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';
import Record from '../models/db/record';
import { EnrichedLevelServer } from '../pages/search';

interface RecordDivProps {
  record: Record;
}

function RecordDiv({ record }: RecordDivProps) {
  return (
    <div>
      <span className='font-bold'>{record.moves}</span>
      <span> by </span>
      <span className='font-bold'>{record.userId.name}</span>
      <span> - {getFormattedDate(record.ts)}</span>
    </div>
  );
}

interface FormattedLevelInfoProps {
  level: EnrichedLevelServer;
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
          key={`record-${levelContext.records[i].ts}`}
          record={levelContext.records[i]}
        />
      );
    }
  }

  return (
    <div>
      <span className='font-bold'>Name:</span> {level.name}
      <br/>
      <span className='font-bold'>Author:</span> {level.userId.name}
      <br/>
      <span className='font-bold'>Created:</span> {getFormattedDate(level.ts)}
      <br/>
      <span className='font-bold'>Difficulty:</span> {level.points}
      <br/>
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
          <br/>
          <span className='font-bold'>Achieved:</span> {getFormattedDate(level.userMovesTs)}
          <br/>
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
