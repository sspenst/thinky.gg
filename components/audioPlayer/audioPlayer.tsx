import { AudioPlayerContext } from '@root/contexts/audioPlayerContext';
import { PageContext } from '@root/contexts/pageContext';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

const songs = [
  /*{
    title: 'Test',
    active: '/sounds/music/test1high.mp3',
    ambient: '/sounds/music/test1.mp3',
    artist: 'Danny',
    website: 'k2xl.com'
  },*/
  {
    title: 'Automation',
    active: '/sounds/music/04 Automaton 2023-09-10.mp3',
    ambient: '/sounds/music/Automaton Ambient 2023-09-10.mp3',
    artist: 'Tim Halbert',
    website: 'https://www.timhalbert.com/',
  },
  {
    title: 'No Chance in Hell',
    ambient: '/sounds/music/No Chance in Hell Ambient 2023-09-10.mp3',
    active: '/sounds/music/02 No Chance in Hell 2023-09-10.mp3',
    artist: 'Tim Halbert',
    website: 'https://www.timhalbert.com/',
  },
  {
    title: 'Treason',
    ambient: '/sounds/music/Treason Ambient 2023-09-10.mp3',
    active: '/sounds/music/05 Treason 2023-09-10.mp3',
    artist: 'Tim Halbert',
    website: 'https://www.timhalbert.com/',
  }
  // Add more songs here
];

function AudioPlayer({ hideHotColdButton, hidePlayButton, hideSeekButtons, hideTitle, hideSettingsButton, onSettingsClick }: {
  hideHotColdButton?: boolean;
  hidePlayButton?: boolean;
  hideSeekButtons?: boolean;
  hideTitle?: boolean;
  hideSettingsButton?: boolean;
  onSettingsClick?: () => void;
}) {
  const {
    currentSongIndex,
    setCurrentSongIndex,
    isHot,
    setIsHot,
    currentTitle,
    setCurrentTitle,
    isPlaying,
    setIsPlaying,
    audioContext,
    setAudioContext,
    audioActive,
    setAudioActive,
    audioAmbient,
    setAudioAmbient
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
    // Listen for metadata loading for active audio
    setCurrentTitle(songs[index].title);

    activeAudio.volume = isHot ? 1 : 0;
    ambientAudio.volume = isHot ? 0 : 1;
    activeAudio.currentTime = 0;
    ambientAudio.currentTime = 0;

    if (isPlaying) {
      activeAudio.currentTime = audioAmbient?.currentTime || 0;
      activeAudio.play();
      ambientAudio.play();

      // add listeners for when the audio ends
      const onLoaded = () => {
        activeAudio.volume = isHot ? 1 : 0;
        ambientAudio.volume = isHot ? 0 : 1;
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
        setIsHot(false);

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
  }, [isPlaying, setCurrentSongIndex, setAudioActive, setAudioAmbient, setCurrentTitle, isHot, audioActive, audioAmbient, setIsHot]);

  const handleUserGesture = useCallback(async () => {
    if (!audioContext) {
      const context = new AudioContext();

      setAudioContext(context);
      seek(currentSongIndex);
    }

    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }

    if (isPlaying && audioActive && audioAmbient) {
      seek(currentSongIndex);
      // make sure they are playing at exact same time
      audioActive.currentTime = audioAmbient.currentTime;

      if (isHot) {
        audioActive.volume = 1;
        audioAmbient.volume = 0;
      } else {
        audioActive.volume = 0;
        audioAmbient.volume = 1;
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      audioActive?.pause();
      audioAmbient?.pause();
    }
  }, [audioContext, isPlaying, audioActive, audioAmbient, setAudioContext, seek, currentSongIndex, isHot]);

  useEffect(() => {
    if (!audioContext) {
      document.addEventListener('click', handleUserGesture);
    }

    return () => {
      document.removeEventListener('click', handleUserGesture);
    };
  }, [audioContext, handleUserGesture]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);

    if (audioContext) {
      if (isPlaying) {
        audioActive?.pause();
        audioAmbient?.pause();
      } else {
        audioActive?.play();
        audioAmbient?.play();
      }
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

    if (audioContext && audioActive && audioAmbient) {
      setIsHot(!isHot);
    }
  }, [isHot, audioContext, audioActive, audioAmbient, setIsHot]);

  useEffect(() => {
  // Clear any existing intervals
    if (intervalRef.current) {
      return;
    }

    if (!(audioContext && audioActive && audioAmbient)) {
      return;
    }

    audioActive.currentTime = audioAmbient.currentTime;

    const duration = 1; // crossfade duration in seconds
    const step = 0.01; // step size
    const startActiveVol = audioActive.volume;
    const startAmbientVol = audioAmbient.volume;

    if (startActiveVol === 1 && isHot) {
      return;
    } else if (startAmbientVol === 1 && !isHot) {
      return;
    }

    let progress = 0;

    intervalRef.current = setInterval(() => {
      progress += step / duration;

      if (!isHot) {
        // Crossfade to ambient version

        audioActive.volume = Math.max(0, startActiveVol * (1 - progress));
        audioAmbient.volume = Math.min(1, startAmbientVol + (1 - startAmbientVol) * progress);
      } else {
        // Crossfade to active version

        audioActive.volume = Math.min(1, startActiveVol + (1 - startActiveVol) * progress);
        audioAmbient.volume = Math.max(0, startAmbientVol * (1 - progress));
      }

      setCrossfadeProgress(progress);

      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        // set volumes to exact values
        audioActive.volume = !isHot ? 0 : 1;
        audioAmbient.volume = !isHot ? 1 : 0;
        intervalRef.current = null;
      }
    }, step * 1000);
  }, [isHot, audioActive, audioAmbient, audioContext]);

  return (
    <div className=' p-2 rounded-lg flex justify-between items-center'
      style={{
        backgroundColor: 'var(--bg-color-3)',
      }}>
      <div className='md:flex flex-row items-center hidden'>
        { !hideSeekButtons && (
          <button
            className='px-3 py-1 rounded audio-bar-button'
            style={{ color: 'var(--color)' }}
            onClick={() => {
              seek((currentSongIndex - 1 + songs.length) % songs.length);
            }
            }>
        ⏮
          </button>
        )}
        { !hideTitle && currentTitle && (<div className='px-3 py-1 rounded overflow-hidden truncate'
          style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
        >
          {currentTitle }
        </div>
        )}

        { !hideSeekButtons && (
          <button
            className='px-3 py-1 rounded audio-bar-button'
            style={{ color: 'var(--color)' }}
            onClick={() => {
              seek((currentSongIndex + 1) % songs.length);
            }
            }>

        ⏭
          </button>
        )}
      </div>
      { !hidePlayButton && (
        <button id='btn-audio-player-play'
          onClick={togglePlay}
          style={{ color: 'var(--color)' }}
          className='px-3 py-1 rounded audio-bar-button'
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      )}
      { !hideHotColdButton &&
      <button id='btn-audio-player-version'
        onClick={() => {toggleVersion();}}
        style={{
          backgroundColor: intervalRef.current !== null ? 'var(--bg-color-4)' : 'var(--bg-color-2)',
          // based on crossfadeProgress, we can animate the background color
          backgroundImage: `linear-gradient(to bottom, var(--bg-color-2) ${crossfadeProgress * 100}%, var(--bg-color-4) ${crossfadeProgress * 100}%)`,
          color: 'var(--color)' }}
        className='px-3 py-1 rounded'
      >
        {isHot ? '🔥' : '❄️'}
      </button>
      }
      { !hideSettingsButton &&
      <button
        style={{ color: 'var(--color)' }}
        className='px-3 py-1 rounded audio-bar-button'
        onClick={() => {
          onSettingsClick && onSettingsClick();
        }}
      >
        ⚙️ {/* Settings icon */}
      </button>
      }
    </div>
  );
}

export default AudioPlayer;
