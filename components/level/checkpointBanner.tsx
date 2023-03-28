import { PageContext } from '@root/contexts/pageContext';
import React, { useContext, useEffect } from 'react';
import CheckpointModal from '../modal/checkpointModal';
import { GameState } from './game';

interface CheckpointBannerProps {
  checkpoints?: (GameState | null)[];
}

export default function CheckpointBanner({ checkpoints }: CheckpointBannerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);

  useEffect(() => {
    setPreventKeyDownEvent(isOpen);
  }, [isOpen, setPreventKeyDownEvent]);

  return (<>
    <div
      className='cursor-pointer'
      onClick={() => {
        setIsOpen(!isOpen);
      }}
    >
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
      </svg>
    </div>
    <CheckpointModal
      checkpoints={checkpoints}
      closeModal={() => setIsOpen(false)}
      isOpen={isOpen}
    />
  </>);
}
