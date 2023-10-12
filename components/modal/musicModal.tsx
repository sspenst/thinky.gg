import { MusicContext } from '@root/contexts/musicContext';
import React, { useContext } from 'react';
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
    crossfadeProgress,
    dynamicMusic, setDynamicMusic,
    isHot,
    isPlaying, setIsPlaying,
    seek,
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
      songMetadata.active.pause();
      songMetadata.ambient.pause();
    } else {
      songMetadata.active.play();
      songMetadata.ambient.play();
    }
  };

  const onVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);

    setVolume(newVolume);

    if (songMetadata) {
      if (isHot) {
        songMetadata.active.volume = newVolume;
      } else {
        songMetadata.ambient.volume = newVolume;
      }
    }
  };

  if (!songMetadata) {
    return null;
  }

  return (
    <Modal closeModal={closeModal} isOpen={isOpen} title='Music'>
      <div className='flex flex-col gap-4 items-center'>
        <div className='flex flex-col'>
          <span className='font-bold'>{songMetadata.title}</span>
          <a
            className='hover:underline italic w-fit'
            href={songMetadata.website}
            rel='noreferrer'
            target='_blank'
          >
            {songMetadata.artist}
          </a>
        </div>
        <div
          className='p-2 rounded-lg flex justify-between items-center w-fit'
          style={{
            backgroundColor: 'var(--bg-color-3)',
          }}
        >
          <button
            className='px-3 py-1 rounded-l audio-bar-button'
            onClick={() => seek(-1)}
          >
            ⏮
          </button>
          <button
            className='px-3 py-1 audio-bar-button'
            id='btn-audio-player-play'
            onClick={togglePlay}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button
            className='px-3 py-1 audio-bar-button'
            onClick={() => seek(1)}
          >
            ⏭
          </button>
          <button
            className='px-3 py-1 rounded-r'
            id='btn-audio-player-version'
            onClick={() => toggleVersion()}
            style={{
              // based on crossfadeProgress, we can animate the background color
              backgroundImage: `linear-gradient(to bottom, var(--bg-color-2) ${crossfadeProgress * 100}%, var(--bg-color-4) ${crossfadeProgress * 100}%)`,
            }}
          >
            {isHot ? '🔥' : '❄️'}
          </button>
        </div>
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
        <div className='flex flex-col gap-2 items-center'>
          <div className='flex gap-2 items-center'>
            <label className='font-medium' htmlFor='dynamic-music'>
              Dynamic Music
            </label>
            <input id='dynamic-music' type='checkbox' checked={dynamicMusic} onChange={() => setDynamicMusic(d => !d)} />
          </div>
          <div className='flex flex-col word-wrap gap-2 text-sm'>
            <span>Changes the music depending on what is happening in the game.</span>
            <span className='text-xs'>For example, if you are in a puzzle, the music will be more ambient ❄️.<br />After solving, the music will transition to a more energetic 🔥 version.</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
