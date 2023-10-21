import { AppContext } from '@root/contexts/appContext';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Dimensions from '../../constants/dimensions';
import getPngDataClient from '../../helpers/getPngDataClient';
import SelectOption from '../../models/selectOption';
import styles from './SelectCard.module.css';
import SelectCardContent from './selectCardContent';
import StyledTooltip from '../page/styledTooltip';

interface SelectCardProps {
  option: SelectOption;
  prefetch?: boolean;
}

export default function SelectCard({ option, prefetch }: SelectCardProps) {
  const { myPlaylist, mutateMyPlaylist } = useContext(AppContext);
  const [backgroundImage, setBackgroundImage] = useState<string>();
  let addToPlaylistBtn;

  if (option.level) {
    const playlistButtonVerb = myPlaylist?.levels.find(l => l.toString() === option.id.toString()) ? '-' : '+';

    addToPlaylistBtn = option.level &&
    (
    <>
    <button
      data-tooltip-id='playlist-btn-tooltip'
      data-tooltip-delay-show={600}
      data-tooltip-content={playlistButtonVerb === '+' ? 'Add to playlist' : 'Remove from playlist'}
      className={classNames(
        'text-md border border-1 absolute bottom-2 m-0 px-1.5 left-2 rounded-lg  bg-gray-800 hover:bg-gray-400',
        styles['add-button'],
      )}
      onClick={async() => {
        toast.dismiss();
        // add background message
        toast.loading('Adding to playlist...', {
          position: 'bottom-center',
        });
        const res = await fetch('/api/playlist/', {
          method: playlistButtonVerb === '+' ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: option.id,
          }),
        });

        toast.dismiss();

        if (res.ok) {
          const message = <div className='flex flex-col text-center'> <span className='text-lg'>{playlistButtonVerb === '+' ? 'Added to ' : 'Removed from'} your playlist!</span> <Link className='text-sm underline' href={'/playlist'}>View Playlist</Link> </div>;

          toast.success(message, {
            duration: 5000,
            position: 'bottom-center',
          });
          mutateMyPlaylist();
        } else {
          let resp;

          try {
            resp = await res.json();
          } catch (e) {
            console.error(e);
          }

          toast.error(resp?.error || 'Could not update playlist', {
            duration: 5000,
            position: 'bottom-center',
          });
        }
      }}
      style={{
        color: 'var(--bg-color-1)',
      }}
    >
      {playlistButtonVerb}
    </button>
    <StyledTooltip id='playlist-btn-tooltip' />
    </>
    );
  }

  useEffect(() => {
    if (option.level) {
      setBackgroundImage(getPngDataClient(option.level.data));
    }
  }, [option.level]);

  const color = option.disabled ? 'var(--bg-color-4)' :
    option.stats?.getColor('var(--color)') ?? 'var(--color)';

  return (
    <div
      className='p-3 overflow-hidden relative inline-block align-middle'
      key={`select-card-${option.id}`}
    >

      <div className='wrapper rounded-md overflow-hidden relative'
        style={{
          height: option.height ?? Dimensions.OptionHeight,
          width: option.width ?? Dimensions.OptionWidth,
        }}
      >

        { /** in the bottom right corner add a plus icon emoji button */}
        <div
          className='absolute background rounded-md bg-cover bg-center'
          style={{
            backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            height: option.height ?? Dimensions.OptionHeight,
            opacity: 0.25,
            transform: 'scale(1.6)',
            width: option.width ?? Dimensions.OptionWidth,
          }}
        />
        {option.href ?
          <Link
            className={classNames(
              'border-2 rounded-md items-center flex justify-center text-center',
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            href={(option.disabled) ? '' : option.href}
            onClick={option.onClick}
            passHref
            prefetch={prefetch}
            style={{
              borderColor: color,
              color: color,
              height: option.height ?? Dimensions.OptionHeight,
              textShadow: '1px 1px black',
              width: option.width ?? Dimensions.OptionWidth,
            }}
          >
            <SelectCardContent option={option} />
          </Link>
          :
          <button
            className={classNames(
              'border-2 rounded-md items-center flex justify-center text-center',
              { 'pointer-events-none': option.disabled },
              !option.disabled ? styles['card-border'] : undefined,
              { 'text-xl': !option.stats },
            )}
            onClick={option.onClick}
            style={{
              borderColor: color,
              color: color,
              height: option.height ?? Dimensions.OptionHeight,
              textShadow: '1px 1px black',
              width: option.width ?? Dimensions.OptionWidth,
            }}
          >
            <SelectCardContent option={option} />
          </button>
        }
        {addToPlaylistBtn}
      </div>

    </div>
  );
}
