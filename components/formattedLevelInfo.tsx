import React, { useContext, useState } from 'react';
import Level from '../models/db/level';
import { LevelContext } from '../contexts/levelContext';
import Record from '../models/db/record';
import getFormattedDate from '../helpers/getFormattedDate';
import useStats from '../hooks/useStats';

interface RecordDivProps {
  record: Record;
}

function RecordDiv({ record }: RecordDivProps) {
  return (<>
    <br/>
    <span className='font-bold'>{record.moves}</span>
    <span> by </span>
    <span className='font-bold'>{record.userId.name}</span>
    <span> - {getFormattedDate(record.ts)}</span>
  </>);
}

interface FormattedLevelInfoProps {
  level: Level;
}

export default function FormattedLevelInfo({ level }: FormattedLevelInfoProps) {
  const [copied, setCopied] = useState(false);
  const levelContext = useContext(LevelContext);
  const { stats } = useStats();
  const stat = stats?.find(stat => stat.levelId === level._id);

  const recordDivs = [];

  if (levelContext?.records) {
    for (let i = 0; i < levelContext.records.length; i++) {
      recordDivs.push(<RecordDiv key={i} record={levelContext.records[i]} />);
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
          setCopied(true);
        }}
      >
        Copy level data to clipboard
      </button>
      {copied ? <span style={{ marginLeft: 10 }}>✅</span> : null}
      {stat ? <>
        <br/>
        <br/>
        <span className='font-bold'>Your least moves:</span> {stat.moves}
        <br/>
        <span className='font-bold'>Achieved:</span> {getFormattedDate(stat.ts)}
        <br/>
        <span className='font-bold'>Your attempts:</span> {stat.attempts}
      </> : null}
      <br/>
      <br/>
      <span className='font-bold'>Least moves history:</span>
      {!levelContext?.records ? <>
        <br/>
        <span>Loading...</span>
      </> : recordDivs}
    </div>
  );
}
