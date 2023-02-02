import React from 'react';
import Dimensions from '../constants/dimensions';
import SelectOption from '../models/selectOption';
import SelectCard from './selectCard';

export default function LoadingCard() {
  return (
    <SelectCard
      option={{
        author: 'Loading...',
        height: Dimensions.OptionHeightLarge,
        disabled: true,
        text: 'Please wait...',
      } as SelectOption}
    />
  );
}
