import { AudioPlayerContext } from '@root/contexts/audioPlayerContext';
import usePrevious from '@root/hooks/usePrevious';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface SongMetaData {
  active: string;
  ambient: string;
  artist: string;
  title: string;
  website: string;
}

const songs = [
  /*{
    title: 'Test',
    active: '/sounds/music/test1high.mp3',
    ambient: '/sounds/music/test1.mp3',
    artist: 'Danny',
    website: 'k2xl.com'
  },*/
  {
    title: 'Pink and Orange',
    ambient: '/sounds/music/01_ambient.mp3',
    active: '/sounds/music/01.mp3',
    artist: 'Tim Halbert',
    website: 'https://www.timhalbert.com/',
  },
  // {
  //   title: 'No Chance in Hell',
  //   ambient: '/sounds/music/No Chance in Hell Ambient 2023-09-10.mp3',
  //   active: '/sounds/music/02 No Chance in Hell 2023-09-10.mp3',
  //   artist: 'Tim Halbert',
  //   website: 'https://www.timhalbert.com/',
  // },
  // {
  //   title: 'Automation',
  //   active: '/sounds/music/04 Automaton 2023-09-10.mp3',
  //   ambient: '/sounds/music/Automaton Ambient 2023-09-10.mp3',
  //   artist: 'Tim Halbert',
  //   website: 'https://www.timhalbert.com/',
  // },
  // {
  //   title: 'Treason',
  //   ambient: '/sounds/music/Treason Ambient 2023-09-10.mp3',
  //   active: '/sounds/music/05 Treason 2023-09-10.mp3',
  //   artist: 'Tim Halbert',
  //   website: 'https://www.timhalbert.com/',
  // },
  // {
  //   title: 'Insecticide',
  //   ambient: '/sounds/music/Insecticide Ambient 2023-09-20.mp3',
  //   active: '/sounds/music/06 Insecticide 2023-08-22.mp3',
  //   artist: 'Tim Halbert',
  //   website: 'https://www.timhalbert.com/',
  // },
  // {
  //   title: 'Flatlander',
  //   ambient: '/sounds/music/Flatlander Ambient 2023-09-20.mp3',
  //   active: '/sounds/music/09 Flatlander 2023-08-24.mp3',
  //   artist: 'Tim Halbert',
  //   website: 'https://www.timhalbert.com/',
  // },
  {
    title: 'Binary Shapes',
    ambient: '/sounds/music/07_ambient.mp3',
    active: '/sounds/music/07.mp3',
    artist: 'Tim Halbert',
    website: 'https://www.timhalbert.com/',
  },
  // Add more songs here
] as SongMetaData[];

export default function AudioPlayer() {
  const {
    audioActive, setAudioActive,
    audioAmbient, setAudioAmbient,
    currentSongIndex, setCurrentSongIndex,
    dynamicMusic,
    isHot, setIsHot,
    isPlaying, setIsPlaying,
    maxVolume,
  } = useContext(AudioPlayerContext);

  const [crossfadeProgress, setCrossfadeProgress] = useState(1);

  const seek = useCallback((index: number) => {
    // Pause current audio elements
    if (isPlaying) {
      audioActive?.pause();
      audioAmbient?.pause();
      audioActive?.src && URL.revokeObjectURL(audioActive.src);
      audioAmbient?.src && URL.revokeObjectURL(audioAmbient.src);
    }

    // Update the index to point to the next/previous song
    setCurrentSongIndex(index);

    // Play the new audio elements (this will be handled by the useEffect)

    const activeAudio = new Audio(songs[index].active);
    const ambientAudio = new Audio(songs[index].ambient);

    setAudioActive(activeAudio);
    setAudioAmbient(ambientAudio);

    activeAudio.volume = isHot ? maxVolume : 0;
    ambientAudio.volume = isHot ? 0 : maxVolume;
    activeAudio.currentTime = 0;
    ambientAudio.currentTime = 0;

    if (isPlaying) {
      activeAudio.currentTime = audioAmbient?.currentTime || 0;
      activeAudio.play();
      ambientAudio.play();

      // add listeners for when the audio ends
      const onLoaded = () => {
        activeAudio.volume = isHot ? maxVolume : 0;
        ambientAudio.volume = isHot ? 0 : maxVolume;
        activeAudio.currentTime = 0;
        ambientAudio.currentTime = activeAudio.currentTime;
      };

      ambientAudio.addEventListener('loadedmetadata', () => {
        // go to near the end of the song

        //  onLoaded();
        // listen for metadata (this just makes it a bit easier to test the transition logic)
        //        if (index === 0) {
        //        ambientAudio.currentTime = ambientAudio.duration - 5;
        //    } else {
        onLoaded();
      //  }
      });
      activeAudio.addEventListener('loadedmetadata', () => {
        // go to near the end of the song
      //  onLoaded();

        //  if (index === 0)
        //  activeAudio.currentTime = activeAudio.duration - 5;
        //else {
        onLoaded();
        //}
      });

      const next = () => {
        ambientAudio.remove();
        activeAudio.remove();

        if (dynamicMusic) {
          setIsHot(false);
        }

        seek((index + 1) % songs.length);
      };

      ambientAudio.addEventListener('ended', () => {
        next();
      });
      // I was worried that this would cause the track to seek double, but it doesn't because we use index rather than the state variable maybe
      activeAudio.addEventListener('ended', () => {
        // do nada
      }

      );
    }

    return () => {
      activeAudio.pause();
      ambientAudio.pause();

      activeAudio.removeEventListener('ended', () => {
        seek((index + 1) % songs.length);
      });
      ambientAudio.removeEventListener('ended', () => {
        seek((index + 1) % songs.length);
      }
      );
    };
  }, [isPlaying, setCurrentSongIndex, setAudioActive, setAudioAmbient, isHot, maxVolume, audioActive, audioAmbient, dynamicMusic, setIsHot]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);

    if (isPlaying) {
      audioActive?.pause();
      audioAmbient?.pause();
    } else {
      audioActive?.play();
      audioAmbient?.play();
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

    if (audioActive && audioAmbient) {
      setIsHot(!isHot);
    }
  }, [audioActive, audioAmbient, isHot, setIsHot]);

  const previousValues = usePrevious({ maxVolume });

  useEffect(() => {
    // Clear any existing intervals
    if (previousValues?.maxVolume !== maxVolume) {
      if (audioActive && audioAmbient) {
        audioActive.volume = !isHot ? 0 : maxVolume;
        audioAmbient.volume = !isHot ? maxVolume : 0;

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      return;
    }

    if (intervalRef.current) {
      return;
    }

    if (!(audioActive && audioAmbient)) {
      return;
    }

    audioActive.currentTime = audioAmbient.currentTime;

    const duration = 1; // crossfade duration in seconds
    const step = 0.01; // step size
    const startActiveVol = audioActive.volume;
    const startAmbientVol = audioAmbient.volume;

    if (startActiveVol >= maxVolume && isHot) {
      audioActive.volume = maxVolume;
      audioAmbient.volume = 0;

      return;
    } else if (startAmbientVol >= maxVolume && !isHot) {
      audioActive.volume = 0;
      audioAmbient.volume = maxVolume;

      return;
    }

    let progress = 0;

    intervalRef.current = setInterval(() => {
      progress += step / duration;

      if (!isHot) {
        // Crossfade to ambient version

        audioActive.volume = Math.max(0, startActiveVol * (1 - progress));
        audioAmbient.volume = Math.min(maxVolume, startAmbientVol + (1 - startAmbientVol) * progress);
      } else {
        // Crossfade to active version

        audioActive.volume = Math.min(maxVolume, startActiveVol + (1 - startActiveVol) * progress);
        audioAmbient.volume = Math.max(0, startAmbientVol * (1 - progress));
      }

      setCrossfadeProgress(progress);

      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        // set volumes to exact values
        audioActive.volume = !isHot ? 0 : maxVolume;
        audioAmbient.volume = !isHot ? maxVolume : 0;
        intervalRef.current = null;
      }
    }, step * 1000);
  }, [audioActive, audioAmbient, isHot, maxVolume, previousValues?.maxVolume]);

  const songMetaData = songs.at(currentSongIndex);

  if (!songMetaData) {
    return null;
  }

  return (
    <div className='flex flex-col gap-2 w-fit items-center justify-center'>
      <div
        className='px-3 py-1 rounded overflow-hidden truncate flex flex-col items-center'
        style={{
          backgroundColor: 'var(--bg-color-2)',
          color: 'var(--color)',
        }}
      >
        <span className='font-bold'>{songMetaData.title}</span>
        <a
          className='hover:underline italic w-fit'
          href={songMetaData.website}
          rel='noreferrer'
          target='_blank'
        >
          {songMetaData.artist}
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
          onClick={() => {
            seek((currentSongIndex - 1 + songs.length) % songs.length);
          }}
          style={{ color: 'var(--color)' }}
        >
        ⏮
        </button>
        <button
          className='px-3 py-1 audio-bar-button'
          id='btn-audio-player-play'
          onClick={togglePlay}
          style={{ color: 'var(--color)' }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button
          className='px-3 py-1 audio-bar-button'
          onClick={() => {
            seek((currentSongIndex + 1) % songs.length);
          }}
          style={{ color: 'var(--color)' }}
        >
        ⏭
        </button>
        <button
          className='px-3 py-1 rounded-r'
          id='btn-audio-player-version'
          onClick={() => {toggleVersion();}}
          style={{
            // based on crossfadeProgress, we can animate the background color
            backgroundImage: `linear-gradient(to bottom, var(--bg-color-2) ${crossfadeProgress * 100}%, var(--bg-color-4) ${crossfadeProgress * 100}%)`,
            color: 'var(--color)' }}
        >
          {isHot ? '🔥' : '❄️'}
        </button>
      </div>
    </div>
  );
}
