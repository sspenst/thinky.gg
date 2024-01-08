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
            <FormattedDifficulty id={option.id} level={option.level} />
          </div>
        }
        {!option.hideStats && option.stats && <div className='pt-1 italic'>{option.stats.getText()}</div>}
      </div>
    </div>
    {option.stats?.isSolved() &&
      <div className='absolute top-0 right-0'>
        <Solved />
      </div>
    }
  </>);
}
