import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { AppContext } from '@root/contexts/appContext';
import { MusicContext, songs } from '@root/contexts/musicContext';
import classNames from 'classnames';
import React, { Fragment, useContext } from 'react';
import Modal from '.';

interface MusicModal {
  closeModal: () => void;
  isOpen: boolean;
}

interface MusicModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function MusicModal({ closeModal, isOpen }: MusicModalProps) {
  const {
    isDynamic, setIsDynamic,
    isDynamicSupported,
    isHot,
    isPlaying, setIsPlaying,
    isSeeking,
    isToggling,
    seek,
    seekByIndex,
    songMetadata,
    toggleVersion,
    volume, setVolume,
  } = useContext(MusicContext);

  const togglePlay = () => {
    setIsPlaying(p => !p);

    if (!songMetadata) {
      return;
    }

    if (isPlaying) {
      songMetadata.original?.pause();
      songMetadata.ambient?.pause();
      songMetadata.thud?.pause();
      songMetadata.originalMp3?.pause();
    } else {
      songMetadata.original?.play();
      songMetadata.ambient?.play();
      songMetadata.originalMp3?.play();
    }
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);

    setVolume(newVolume);

    if (!songMetadata) {
      return;
    }

    if (isHot) {
      if (songMetadata.original) {
        songMetadata.original.volume = newVolume;
      }

      if (songMetadata.ambient) {
        songMetadata.ambient.volume = 0;
      }
    } else {
      if (songMetadata.ambient) {
        songMetadata.ambient.volume = newVolume;
      }

      if (songMetadata.original) {
        songMetadata.original.volume = 0;
      }
    }

    if (songMetadata.thud) {
      songMetadata.thud.volume = newVolume;
    }

    if (songMetadata.originalMp3) {
      songMetadata.originalMp3.volume = newVolume;
    }
  };

  const { deviceInfo } = useContext(AppContext);
  const isIOS = deviceInfo.isIOS;

  return (
    <Modal closeModal={closeModal} isOpen={isOpen} title='Music'>
      <div className='flex flex-col gap-4 items-center'>
        {songMetadata &&
          <a
            className='hover:underline italic w-fit'
            href={songMetadata.artistHref}
            rel='noreferrer'
            target='_blank'
          >
            {songMetadata.artist}
          </a>
        }
        <Menu as='div' className='relative inline-block text-left z-30'>
          <MenuButton id='dropdownMenuBtn' aria-label='dropdown menu'>
            <div className='flex items-center gap-2 hover-bg-3 px-3 py-1 rounded-md'>
              <div className={classNames(
                'font-bold',
                { 'animate-pulse': isPlaying },
                isPlaying && (isHot ? 'text-orange-400' : 'text-blue-400'),
              )}>
                {songMetadata?.title ?? 'Audio not found'}
              </div>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-3 h-3'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' />
              </svg>
            </div>
          </MenuButton>
          <Transition
            as={Fragment}
            enter='transition ease-out duration-100'
            enterFrom='transform opacity-0 scale-95'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in duration-75'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-95'
          >
            <MenuItems className='absolute m-1 origin-top-right rounded-[10px] shadow-lg border overflow-y-auto overflow-x-hidden bg-1 border-color-3'>
              <div className='px-1 py-1'>
                {songs.map((song, index) => {
                  const isSongPlaying = song.title === songMetadata?.title && isPlaying;

                  return (
                    <MenuItem key={`song-select-menu-${song.title}`}>
                      {() => (
                        <button
                          className={classNames(
                            'hover-bg-3 px-3 py-1 rounded-md w-44',
                            { 'animate-pulse': isSongPlaying },
                            isSongPlaying && (isHot ? 'text-orange-400' : 'text-blue-400'),
                          )}
                          key={`song-select-${song.title}`}
                          onClick={() => seekByIndex(index)}
                        >
                          {song.title}
                        </button>
                      )}
                    </MenuItem>
                  );
                })}
              </div>
            </MenuItems>
          </Transition>
        </Menu>
        <div
          className='p-1 rounded-lg flex justify-between items-center w-fit'
          style={{
            backgroundColor: 'var(--bg-color-3)',
          }}
        >
          <button
            className='px-3 py-1 rounded-l audio-bar-button disabled:opacity-50'
            disabled={isSeeking}
            onClick={() => seek(-1)}
          >
            ⏮
          </button>
          <button
            className='px-3 py-1 audio-bar-button disabled:opacity-50'
            disabled={isSeeking}
            id='btn-audio-player-play'
            onClick={togglePlay}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            className={classNames(
              'px-3 py-1 audio-bar-button disabled:opacity-50',
              { 'rounded-r': !isDynamicSupported },
            )}
            disabled={isSeeking}
            onClick={() => seek(1)}
          >
            ⏭
          </button>
          {isDynamicSupported &&
            <button
              className='px-3 py-1 rounded-r audio-bar-button'
              disabled={isToggling}
              id='btn-audio-player-version'
              onClick={() => toggleVersion()}
            >
              {isToggling ? '⏳' : isHot ? '🔥' : '❄️'}
            </button>
          }
        </div>
        {!isIOS &&
          <div className='flex gap-2 items-center'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z' />
            </svg>
            <input
              max='1'
              min='0'
              onChange={onVolumeChange}
              step='0.01'
              type='range'
              value={volume}
            />
          </div>
        }
        {isDynamicSupported &&
          <div className='flex flex-col gap-2 items-center'>
            <div className='flex gap-2 items-center'>
              <label className='font-medium' htmlFor='dynamic-music'>
                Dynamic Music
              </label>
              <input id='dynamic-music' type='checkbox' checked={isDynamic} onChange={() => setIsDynamic(d => !d)} />
            </div>
            <div className='flex flex-col word-wrap gap-2 text-sm'>
              <span>Changes the music depending on what is happening in the game.</span>
              <span className='text-xs'>For example, if you are in a puzzle, the music will be more ambient ❄️.<br />After solving, the music will transition to a more energetic 🔥 version.</span>
            </div>
          </div>
        }
      </div>
    </Modal>
  );
}
