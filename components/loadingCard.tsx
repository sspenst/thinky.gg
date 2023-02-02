import React from 'react';
import Dimensions from '../constants/dimensions';
import SelectOption from '../models/selectOption';
import LoadingSpinner from './loadingSpinner';
import SelectCard from './selectCard';

export default function LoadingCard() {
  return (
    <SelectCard
      option={{
        height: Dimensions.OptionHeightLarge,
        disabled: true,
        text: <LoadingSpinner />,
      } as SelectOption}
    />
  );
}
