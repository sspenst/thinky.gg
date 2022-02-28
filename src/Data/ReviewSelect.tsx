import { useCallback, useEffect } from 'react';
import React from 'react';
import Review from '../DataModels/Psychopath/Review';

interface ReviewSelectProps {
  goToLevelSelect: () => void;
  reviews: Review[];
}

export default function ReviewSelect({ goToLevelSelect, reviews }: ReviewSelectProps) {
  const handleKeyDown = useCallback(event => {
    if (event.code === 'Escape') {
      goToLevelSelect();
    }
  }, [goToLevelSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const buttons = [];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    buttons.push(
      <div
        key={i} className={'border-2'}
        style={{
          height: '100px',
          verticalAlign: 'top',
        }}>
        {review.name}
        <br/>
        {review.text}
        <br/>
        {review.psychopathId}
      </div>
    );
  }

  return (
    <div>
      {buttons}
    </div>
  );
}
