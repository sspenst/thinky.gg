import classNames from 'classnames';
import React from 'react';
import Dimensions from '../constants/dimensions';
import SelectOption from '../models/selectOption';
import { getFormattedDifficulty } from './difficultyDisplay';

interface SelectCardContentProps {
  option: SelectOption;
}

export default function SelectCardContent({ option }: SelectCardContentProps) {
  return (
    <div
      className={classNames('font-bold break-words p-2')}
      style={{
        width: Dimensions.OptionWidth,
      }}
    >
      <div className={classNames((option.text as string)?.length >= 20 ? 'text-sm' : 'text-lg')}>
        {option.text}
      </div>
      <div className='text-sm'>
        {option.author && <div className='pt-1 italic'>{option.author}</div>}
        {!option.hideDifficulty && option.level &&
          <div className='pt-1'>
            {getFormattedDifficulty(
              option.level.calc_difficulty_estimate,
              option.level.calc_playattempts_unique_users_count !== undefined ?
                option.level.calc_playattempts_unique_users_count :
                option.level.calc_playattempts_unique_users.length
            )}
          </div>
        }
        {option.stats && <div className='pt-1 italic'>{option.stats.getText()}</div>}
      </div>
    </div>
  );
}
