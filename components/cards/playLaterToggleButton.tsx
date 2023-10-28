import { AppContext } from '@root/contexts/appContext';
import { EnrichedLevel } from '@root/models/db/level';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext } from 'react';
import toast from 'react-hot-toast';
import StyledTooltip from '../page/styledTooltip';
import styles from './SelectCard.module.css';

export function PlayLaterToggleButton({ level }: {level: EnrichedLevel}) {
  const { user, myPlayLater, mutateMyPlayLater } = useContext(AppContext);
  const PlayLaterButtonVerb = myPlayLater && myPlayLater[level._id.toString()] ? '-' : '+';

  return <>
    <button
      data-tooltip-id={'PlayLater-btn-tooltip-' + level._id.toString()}
      data-tooltip-delay-show={600}
      data-tooltip-content={PlayLaterButtonVerb === '+' ? 'Add to Play Later' : 'Remove from Play Later'}
      className={classNames(
        'text-md border border-1 m-0 px-1.5',
        'rounded-lg w-6  bg-gray-800 hover:bg-gray-400',
        styles['add-button'],

      )}
      onClick={async() => {
        toast.dismiss();
        // add background message
        toast.loading('Adding to PlayLater...', {
          position: 'bottom-center',
        });
        const res = await fetch('/api/play-later/', {
          method: PlayLaterButtonVerb === '+' ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: level._id.toString(),
          }),
        });

        toast.dismiss();

        if (res.ok && user) {
          const message = (<div className='flex flex-col text-center w-max'>
            <span className='text-md'>{PlayLaterButtonVerb === '+' ? 'Added to ' : 'Removed from'} your Play Later collection!</span>
            <Link className='text-sm underline' href={'/collection/' + user.name + '/play-later'}>View Play Later</Link> </div>
          );

          toast.success(message, {
            duration: 5000,
            position: 'bottom-center',
            icon: PlayLaterButtonVerb === '+' ? '➕' : '➖',
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
        color: 'var(--bg-color-1)',
        fontWeight: 'bold',
      }}
    >
      {PlayLaterButtonVerb}
    </button>
    <StyledTooltip id={'PlayLater-btn-tooltip-' + level._id.toString()} />
  </>;
}
