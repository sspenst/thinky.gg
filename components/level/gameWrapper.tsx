import { debounce } from 'debounce';
import Link from 'next/link';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import { throttle } from 'throttle-debounce';
import Collection from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import styles from './Controls.module.css';
import Game from './game';

interface GameWrapperProps {
  collection: Collection | undefined;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({ collection, level, onNext, onPrev, user }: GameWrapperProps) {
  const signUpToast = throttle(2500, () => {
    toast.dismiss();
    toast.success(
      <div className='flex flex-row'>
        <div>
          <h1 className='text-center text-2xl'>Good job!</h1>
          <h2 className='text-center text-sm'>But your progress isn&apos;t saved...</h2>
          <div className='text-center'>
            <Link href='/signup' className='underline font-bold'>Sign up</Link> (free) to save your progress and get access to more features.
          </div>
        </div>
        <svg className='h-5 w-5 my-1.5 ml-2 cursor-pointer' fill={'var(--bg-color-4)'} version='1.1' id='Capa_1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 460.775 460.775' xmlSpace='preserve' onClick={() => toast.dismiss()}>
          <path d='M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
          c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
          c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
          c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
          l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
          c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z' />
        </svg>
      </div>
      ,
      {
        duration: 10000,
        icon: '🎉',
      });
  });

  const addNextButtonHighlight = useCallback(() => {
    // find <button> with id 'btn-next'
    const nextButton = document.getElementById('btn-next') as HTMLButtonElement;

    // add css style to have it blink
    nextButton?.classList.add(styles['highlight-once']);
    setTimeout(() => {
      nextButton?.classList.remove(styles['highlight-once']);
    }, 1300);
  }, []);

  return (
    <Game
      allowFreeUndo={true}
      disablePlayAttempts={!user}
      disableStats={!user}
      enableLocalSessionRestore={true}
      key={`game-${level._id.toString()}`}
      level={level}
      onComplete={() => {
        if (!user) {
          signUpToast();
        }

        if (collection) {
          addNextButtonHighlight();
        }
      }}
      onNext={collection ? onNext : undefined}
      onPrev={collection ? onPrev : undefined}
    />
  );
}
