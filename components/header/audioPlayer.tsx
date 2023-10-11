import { AudioPlayerContext } from '@root/contexts/audioPlayerContext';
import usePrevious from '@root/hooks/usePrevious';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

export default function AudioPlayer() {
  const {
    isHot, setIsHot,
    isPlaying, setIsPlaying,
    seek,
    songMetadata,
    volume,
  } = useContext(AudioPlayerContext);

  const [crossfadeProgress, setCrossfadeProgress] = useState(1);

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

  const intervalRef = useRef<null | NodeJS.Timeout>(null);

  const toggleVersion = useCallback((type: 'hot' | 'cool' | 'switch' = 'switch') => {
    if (type === 'hot' && isHot) {
      return;
    }

    if (type === 'cool' && !isHot) {
      return;
    }

    if (intervalRef.current) {
      return;
    }

    setIsHot(h => !h);
  }, [isHot, setIsHot]);

  const previousValues = usePrevious({ volume });

  useEffect(() => {
    // Clear any existing intervals
    if (previousValues?.volume !== volume) {
      if (songMetadata) {
        songMetadata.active.volume = !isHot ? 0 : volume;
        songMetadata.ambient.volume = !isHot ? volume : 0;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      return;
    }

    if (intervalRef.current) {
      return;
    }

    if (!songMetadata) {
      return;
    }

    songMetadata.active.currentTime = songMetadata.ambient.currentTime;

    const duration = 1; // crossfade duration in seconds
    const step = 0.01; // step size
    const startActiveVol = songMetadata.active.volume;
    const startAmbientVol = songMetadata.ambient.volume;

    if (startActiveVol >= volume && isHot) {
      songMetadata.active.volume = volume;
      songMetadata.ambient.volume = 0;

      return;
    } else if (startAmbientVol >= volume && !isHot) {
      songMetadata.active.volume = 0;
      songMetadata.ambient.volume = volume;

      return;
    }

    let progress = 0;

    intervalRef.current = setInterval(() => {
      progress += step / duration;

      if (!isHot) {
        // Crossfade to ambient version

        songMetadata.active.volume = Math.max(0, startActiveVol * (1 - progress));
        songMetadata.ambient.volume = Math.min(volume, startAmbientVol + (1 - startAmbientVol) * progress);
      } else {
        // Crossfade to active version

        songMetadata.active.volume = Math.min(volume, startActiveVol + (1 - startActiveVol) * progress);
        songMetadata.ambient.volume = Math.max(0, startAmbientVol * (1 - progress));
      }

      setCrossfadeProgress(progress);

      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        // set volumes to exact values
        songMetadata.active.volume = !isHot ? 0 : volume;
        songMetadata.ambient.volume = !isHot ? volume : 0;
        intervalRef.current = null;
      }
    }, step * 1000);
  }, [isHot, previousValues?.volume, songMetadata, volume]);

  if (!songMetadata) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2 w-fit items-center justify-center'>
      <div className='px-3 py-1 rounded overflow-hidden truncate flex flex-col items-center'>
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
        className='p-2 rounded-lg flex justify-between items-center'
        style={{
          backgroundColor: 'var(--bg-color-3)',
        }}
      >
        <button
          className='px-3 py-1 rounded-l audio-bar-button'
          onClick={() => seek(1)}
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
          onClick={() => seek(-1)}
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
    </div>
  );
}
