import React, { useCallback, useEffect, useState } from 'react';
import Level from '../../models/db/level';
import Modal from '.';
import Record from '../../models/db/record';
import getFormattedDate from '../../helpers/getFormattedDate';
import useStats from '../../hooks/useStats';

interface RecordDivProps {
  record: Record;
}

function RecordDiv({ record }: RecordDivProps) {
  return (<>
    <br/>
    <span className='font-bold'>{record.moves}</span>
    <span> by </span>
    <span className='font-bold'>{record.userId.name}</span>
    <span> on {getFormattedDate(record.ts)}</span>
  </>);
}

interface LevelInfoModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function LevelInfoModal({ closeModal, isOpen, level }: LevelInfoModalProps) {
  const { stats } =  useStats();
  const stat = stats?.find(stat => stat.levelId === level._id);
  const [records, setRecords] = useState<Record[]>();

  const getRecords = useCallback(() => {
    fetch(`/api/records/${level._id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setRecords(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching records');
    });
  }, [level._id]);

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const recordDivs = [];

  if (records) {
    for (let i = 0; i < records.length; i++) {
      recordDivs.push(<RecordDiv key={i} record={records[i]} />);
    }
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Level Info'}
    >
      <div>
        <span className='font-bold'>Name:</span> {level.name}
        <br/>
        <span className='font-bold'>Universe:</span> {level.userId.name}
        <br/>
        <span className='font-bold'>Created:</span> {getFormattedDate(level.ts)}
        <br/>
        <span className='font-bold'>Difficulty:</span> {level.points}
        {stat ? <>
          <br/>
          <br/>
          <span className='font-bold'>Your least moves:</span> {stat.moves}
          <br/>
          <span className='font-bold'>On:</span> {getFormattedDate(stat.ts)}
          <br/>
          <span className='font-bold'>Your attempts:</span> {stat.attempts}
        </> : null}
        <br/>
        <br/>
        <span className='font-bold'>Least moves history:</span>
        {records === undefined ? <>
          <br/>
          <span>Loading...</span>
        </> : recordDivs}
      </div>
    </Modal>
  );
}
