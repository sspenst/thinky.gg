import FormattedDate from '@root/components/formatted/formattedDate';
import FormattedUser from '@root/components/formatted/formattedUser';
import StyledTooltip from '@root/components/page/styledTooltip';
import Dimensions from '@root/constants/dimensions';
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
        className='flex gap-2 items-center'
        key={`record-${record._id}`}
      >
        <span
          className='font-bold w-11 text-right'
          data-tooltip-content={`${record.moves} step${record.moves === 1 ? '' : 's'}`}
          data-tooltip-id='steps'
          style={{
            minWidth: 44,
          }}
        >
          {record.moves}
        </span>
        <StyledTooltip id='steps' />
        <FormattedUser size={Dimensions.AvatarSizeSmall} user={record.userId} />
        <FormattedDate ts={record.ts} />
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
