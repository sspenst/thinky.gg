import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import { EnrichedLevel } from '@root/models/db/level';
import Link from 'next/link';
import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import StyledTooltip from '../page/styledTooltip';

export function PlayLaterToggleButton({ level }: {level: EnrichedLevel}) {
  const { myPlayLater, mutateMyPlayLater, user } = useContext(AppContext);
  const isInPlayLater = !!(myPlayLater && myPlayLater[level._id.toString()]);

  if (!user || !isPro(user)) {
    return null;
  }

  return <>
    <button
      className='hover-bg-4 rounded-full'
      data-tooltip-content={isInPlayLater ? 'Remove from Play Later' : 'Add to Play Later'}
      data-tooltip-delay-show={600}
      data-tooltip-id={'play-later-btn-tooltip-' + level._id.toString()}
      onClick={async (e) => {
        e.preventDefault();

        toast.dismiss();
        toast.loading(`${isInPlayLater ? 'Remvoing from' : 'Adding to'} to PlayLater...`, {
          position: 'bottom-center',
        });
        const res = await fetch('/api/play-later/', {
          method: isInPlayLater ? 'DELETE' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: level._id.toString(),
          }),
        });

        toast.dismiss();

        if (res.ok) {
          const message = (<div className='flex flex-col text-center w-max'>
            <span className='text-md'>{isInPlayLater ? 'Removed from' : 'Added to'} your Play Later collection!</span>
            <Link className='text-sm underline' href={'/collection/' + user.name + '/play-later'}>View Play Later</Link> </div>
          );

          toast.success(message, {
            duration: 5000,
            position: 'bottom-center',
            icon: isInPlayLater ? '➖' : '➕',
          });
          mutateMyPlayLater();
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
