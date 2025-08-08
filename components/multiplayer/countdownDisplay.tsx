import React from 'react';

interface CountdownDisplayProps {
  countDown: number;
}

export default function CountdownDisplay({ countDown }: CountdownDisplayProps) {
  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;

  if (countDown <= 0) return null;

  return (
    <div className='relative animate-pulse'>
      <div className='absolute -inset-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 blur-lg opacity-50' />
      <div className='relative bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
        <h1 className='text-2xl font-bold text-center'>
          <span className='bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent'>
            Starting in {timeUntilEndCleanStr}
          </span>
        </h1>
      </div>
    </div>
  );
}