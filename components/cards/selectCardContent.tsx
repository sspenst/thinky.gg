import FormattedDifficulty from '@root/components/formatted/formattedDifficulty';
import Solved from '@root/components/level/info/solved';
import Dimensions from '@root/constants/dimensions';
import SelectOption from '@root/models/selectOption';
import classNames from 'classnames';
import React from 'react';

interface SelectCardContentProps {
  option: SelectOption;
}

export default function SelectCardContent({ option }: SelectCardContentProps) {
  return (<>
    <div
      className='font-bold break-words p-2 max-w-full'
      style={{
        width: option.width ?? Dimensions.OptionWidth,
      }}
    >
      <div className={classNames('truncate', (option.text as string)?.length >= 20 ? 'text-sm' : 'text-lg')}>
        {option.text}
      </div>
      <div className='text-sm'>
        {option.author && <div className='pt-1 italic truncate'>{option.author}</div>}
        {!option.hideDifficulty && option.level &&
          <div className='pt-1'>
            <FormattedDifficulty
              difficultyEstimate={option.level.calc_difficulty_estimate}
              id={option.id}
              uniqueUsers={option.level.calc_playattempts_unique_users_count !== undefined ?
                option.level.calc_playattempts_unique_users_count :
                option.level.calc_playattempts_unique_users.length}
            />
          </div>
        }
        {!option.hideStats && option.stats && <div className='pt-1 italic'>{option.stats.getText()}</div>}
      </div>
    </div>
    {option.level?.isRanked && <>
      <div className='absolute top-0 left-0 text-yellow-500 p-1'>
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' className='w-5 h-5'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' />
        </svg>
      </div>
    </>}
    {option.stats?.isSolved() &&
      <div className='absolute top-0 right-0'>
        <Solved />
      </div>
    }
  </>);
}
