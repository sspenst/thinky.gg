import FormattedUser from '@root/components/formattedUser';
import Dimensions from '@root/constants/dimensions';
import getFormattedDate from '@root/helpers/getFormattedDate';
import React, { useContext, useState } from 'react';
import { LevelContext } from '../../../contexts/levelContext';

export default function LevelInfoRecords() {
  const [hideHistory, setHideHistory] = useState(true);
  const levelContext = useContext(LevelContext);

  if (!levelContext?.records) {
    return (
      <div>
        Loading...
      </div>
    );
  }

  const recordDivs = [];

  for (let i = 0; i < levelContext.records.length; i++) {
    const record = levelContext.records[i];

    recordDivs.push(
      <div
        className='flex gap-1.5 items-center'
        key={`record-${record._id}`}
      >
        <span className='font-bold w-11 text-right'>{record.moves}</span>
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
        <span className='text-sm' style={{
          color: 'var(--color-gray)',
        }}>{getFormattedDate(record.ts)}</span>
      </div>
    );

    if (hideHistory) {
      break;
    }
  }

  return (
    <>
      {recordDivs}
      {levelContext.records.length > 1 &&
        <button
          className='italic underline block mt-1 text-sm'
          onClick={() => setHideHistory(s => !s)}
        >
          {`${hideHistory ? 'Show' : 'Hide'} history`}
        </button>
      }
    </>
  );
}
