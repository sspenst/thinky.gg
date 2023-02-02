import React from 'react';
import Dimensions from '../constants/dimensions';
import SelectOption from '../models/selectOption';
import SelectCard from './selectCard';

export default function LoadingCard({ title }: {title?: string}): JSX.Element {
  return (
    <div className='flex flex-col justify-center rounded-lg border animate-pulse'
      style={{
        backgroundColor: 'var(--bg-color-2)',
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <h2 className='self-center px-4 pt-3 text-lg font-bold'>
        {title}
      </h2>
      <SelectCard
        option={{
          author: 'Loading...',
          height: Dimensions.OptionHeightLarge,
          disabled: true,
          text: 'Please wait...',
        } as SelectOption}
      />
    </div>
  );
}
