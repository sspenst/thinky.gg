import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import { EnrichedLevel } from '@root/models/db/level';
import Link from 'next/link';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import StyledTooltip from '../page/styledTooltip';

export function PlayLaterToggleButton({ level }: {level: EnrichedLevel}) {
  const { mutatePlayLater, playLater, user } = useContext(AppContext);
  const isInPlayLater = !!(playLater && playLater[level._id.toString()]);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || !isPro(user)) {
    return null;
  }

  const boldedLevelName = <span className='font-bold'>{level.name}</span>;
  const fetchFunc = async (remove: boolean) => {
    setIsLoading(true);
    toast.dismiss();
    toast.loading(remove ? 'Removing...' : 'Adding...', {
      position: 'bottom-center',
    });

    const res = await fetch('/api/play-later/', {
      method: remove ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: level._id.toString(),
      }),
    });

    toast.dismiss();

    if (res.ok) {
      const message = (
        <div className='flex flex-col items-center w-max'>
          <span>{remove ? ['Removed ', boldedLevelName, ' from'] : ['Added ', boldedLevelName, ' to']} <Link className='underline' href={`/collection/${user.name}/play-later`}>Play Later</Link></span>
          <button className='text-sm underline' onClick={() => {
            toast.dismiss();
            fetchFunc(!remove);
          }}>Undo</button>
        </div>
      );

      toast.success(message, {
        duration: 5000,
        position: 'bottom-center',
        icon: remove ? '➖' : '➕',
      });
      mutatePlayLater();
    } else {
      let resp;

      try {
        resp = await res.json();
      } catch (e) {
        console.error(e);
      }

      toast.error(resp?.error || 'Could not update Play Later', {
        duration: 5000,
        position: 'bottom-center',
      });
    }

    setIsLoading(false);
  };

  return <>
    <button
      data-tooltip-content={isInPlayLater ? 'Remove from Play Later' : 'Add to Play Later'}
      data-tooltip-id={'play-later-btn-tooltip-' + level._id.toString()}
      disabled={isLoading}
      onClick={async (e) => {
        e.preventDefault();
        fetchFunc(isInPlayLater);
      }}
      style={{
        color: 'var(--color)',
      }}
    >
      {isInPlayLater ?
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 12h-15' />
        </svg>
        :
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
        </svg>
      }
    </button>
    <StyledTooltip id={'play-later-btn-tooltip-' + level._id.toString()} />
  </>;
}
