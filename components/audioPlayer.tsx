import { HeaderContext } from '@root/contexts/headerContext';
import { PageContext } from '@root/contexts/pageContext';
import React, { useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';

const songs = [
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

const AudioPlayer: React.FC = () => {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVersion, setActiveVersion] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioActive, setAudioActive] = useState<HTMLAudioElement | null>(null);
  const [audioAmbient, setAudioAmbient] = useState<HTMLAudioElement | null>(null);

  const [crossfadeProgress, setCrossfadeProgress] = useState(0);

  const seek = useCallback((index: number) => {
    // Pause current audio elements
    if (isPlaying) {
      audioActive?.pause();
      audioAmbient?.pause();
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

    activeAudio.volume = activeVersion ? 1 : 0;
    ambientAudio.volume = activeVersion ? 0 : 1;

    if (isPlaying) {
      activeAudio.currentTime = audioAmbient?.currentTime || 0;
      activeAudio.play();
      ambientAudio.play();
    }
  }, [isPlaying, activeVersion, audioActive, audioAmbient]);

  const handleUserGesture = useCallback(async () => {
    if (!audioContext) {
      const context = new AudioContext();

      console.log('Setting audio context');
      setAudioContext(context);
      seek(currentSongIndex);
    }

    if (audioContext?.state === 'suspended') {
      console.log('Resuming audio context');
      await audioContext.resume();
    }

    if (isPlaying && audioActive && audioAmbient) {
      audioActive.play();
      audioAmbient.play();
      // make sure they are playing at exact same time
      audioActive.currentTime = audioAmbient.currentTime;

      if (activeVersion) {
        audioActive.volume = 1;
        audioAmbient.volume = 0;
      } else {
        audioActive.volume = 0;
        audioAmbient.volume = 1;
      }
    } else {
      console.log('Pausing audio', audioActive, audioAmbient, isPlaying);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      audioActive?.pause();
      audioAmbient?.pause();
    }
  }, [audioContext, isPlaying, audioActive, audioAmbient, seek, currentSongIndex, activeVersion]);

  useEffect(() => {
    if (!audioContext) {
      console.log('Adding event listener');

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
    if (type === 'hot' && activeVersion) {
      return;
    }

    if (type === 'cool' && !activeVersion) {
      return;
    }

    if (audioContext && audioActive && audioAmbient) {
    // Clear any existing intervals
      if (intervalRef.current) {
        return;
      }

      audioActive.currentTime = audioAmbient.currentTime;

      const duration = 1; // crossfade duration in seconds
      const step = 0.01; // step size
      const startActiveVol = audioActive.volume;
      const startAmbientVol = audioAmbient.volume;

      let progress = 0;

      intervalRef.current = setInterval(() => {
        progress += step / duration;

        if (activeVersion) {
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
          audioActive.volume = activeVersion ? 0 : 1;
          audioAmbient.volume = activeVersion ? 1 : 0;
          intervalRef.current = null;
        }
      }, step * 1000);

      setActiveVersion(!activeVersion);
    }
  }, [audioContext, audioActive, audioAmbient, activeVersion]);

  const { setToggleVersion } = useContext(HeaderContext);

  useEffect(() => {
    console.log('Setting toggle version');
    setToggleVersion(() => toggleVersion);
  }, [setToggleVersion, toggleVersion]);

  return (
    <div className=' p-2 rounded-lg flex justify-between items-center'
      style={{
        backgroundColor: 'var(--bg-color-3)',
      }}>
      {/* Non-mobile width elements */}
      <div className='md:flex flex-row items-center hidden '>
        <button
          className='px-3 py-1 rounded'
          style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
          onClick={() => {
            seek((currentSongIndex - 1 + songs.length) % songs.length);
          }
          }>
        ⏮
        </button>
        <div className='px-3 py-1 rounded overflow-hidden truncate'
          style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
        >
          {currentTitle }
        </div>
        <button
          className='px-3 py-1 rounded'
          style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
          onClick={() => {
            seek((currentSongIndex + 1) % songs.length);
          }
          }>

        ⏭
        </button>
      </div>

      {/* Common elements */}
      <button id='btn-audio-player-play'
        onClick={togglePlay}
        style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
        className='px-3 py-1 rounded'
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button id='btn-audio-player-version'
        onClick={() => {toggleVersion();}}
        style={{
          backgroundColor: intervalRef.current !== null ? 'var(--bg-color-4)' : 'var(--bg-color-2)',
          // based on crossfadeProgress, we can animate the background color
          backgroundImage: `linear-gradient(to bottom, var(--bg-color-2) ${crossfadeProgress * 100}%, var(--bg-color-4) ${crossfadeProgress * 100}%)`,
          color: 'var(--color)' }}
        className='px-3 py-1 rounded'
      >
        {activeVersion ? '🔥' : '❄️'}
      </button>
      <button
        style={{ backgroundColor: 'var(--bg-color-2)', color: 'var(--color)' }}
        className='px-3 py-1 rounded'
      >
        ⚙️ {/* Settings icon */}
      </button>
    </div>
  );
};

export default AudioPlayer;
