import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface MusicContextInterface {
  dynamicMusic: boolean;
  isHot: boolean;
  isMusicSupported: boolean;
  isPlaying: boolean;
  isToggling: boolean;
  seek: (offset: number) => void;
  setDynamicMusic: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  songMetadata?: SongMetadata;
  toggleVersion: (command?: 'hot' | 'cold' | 'switch') => void;
  volume: number;
}

export const MusicContext = createContext<MusicContextInterface>({
  dynamicMusic: false,
  isHot: false,
  isMusicSupported: false,
  isPlaying: false,
  isToggling: false,
  seek: () => {},
  setDynamicMusic: () => {},
  setIsPlaying: () => {},
  setVolume: () => {},
  toggleVersion: () => {},
  volume: 0,
});

interface BaseSongMetadata {
  artist: string;
  title: string;
  website: string;
}

interface InitialSongMetadata extends BaseSongMetadata {
  ambient: string;
  original: string;
  thud: string;
}

interface SongMetadata extends BaseSongMetadata {
  ambient: HTMLAudioElement;
  original: HTMLAudioElement;
  thud: HTMLAudioElement;
}

export const songs = [
  {
    ambient: '/sounds/music/ambient/01.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/01.ogg',
    thud: '/sounds/music/thud/01,10.ogg',
    title: 'Pink and Orange',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/02.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/02.ogg',
    thud: '/sounds/music/thud/02.ogg',
    title: 'No Chance in Hell',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/03.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/03.ogg',
    thud: '/sounds/music/thud/03.ogg',
    title: 'The Exchange',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/04.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/04.ogg',
    thud: '/sounds/music/thud/04,07.ogg',
    title: 'Automaton',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/05.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/05.ogg',
    thud: '/sounds/music/thud/05.ogg',
    title: 'Treason',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/06.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/06.ogg',
    thud: '/sounds/music/thud/06.ogg',
    title: 'Insecticide',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/07.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/07.ogg',
    thud: '/sounds/music/thud/04,07.ogg',
    title: 'Binary Shapes',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/08.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/08.ogg',
    thud: '/sounds/music/thud/08,09.ogg',
    title: 'Peaceful Encounter',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/09.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/09.ogg',
    thud: '/sounds/music/thud/08,09.ogg',
    title: 'Flatlander',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/ambient/10.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/original/10.ogg',
    thud: '/sounds/music/thud/01,10.ogg',
    title: 'Anx',
    website: 'https://www.timhalbert.com/',
  },
] as InitialSongMetadata[];

export default function MusicContextProvider({ children }: { children: React.ReactNode }) {
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHot, setIsHot] = useState(false);
  const [isMusicSupported, setIsMusicSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const songIndex = useRef(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(0.66);

  useEffect(() => {
    const audio = new Audio();
    const canPlayOgg = audio.canPlayType('audio/ogg') !== '';

    setIsMusicSupported(canPlayOgg);
    audio.remove();

    if (!canPlayOgg) {
      return;
    }

    const lsDynamic = localStorage.getItem('musicDynamic');
    const lsHot = localStorage.getItem('musicHot');
    const lsIndex = localStorage.getItem('musicIndex');
    const lsVolume = localStorage.getItem('musicVolume');

    if (lsDynamic !== null) {
      setDynamicMusic(lsDynamic === 'true');
    }

    if (lsHot !== null) {
      setIsHot(lsHot === 'true');
    }

    if (lsIndex !== null) {
      songIndex.current = parseInt(lsIndex);
    }

    if (lsVolume !== null) {
      setVolume(parseFloat(lsVolume));
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('musicDynamic', dynamicMusic.toString());
  }, [dynamicMusic]);

  useEffect(() => {
    localStorage.setItem('musicHot', isHot.toString());
  }, [isHot]);

  useEffect(() => {
    localStorage.setItem('musicVolume', volume.toString());
  }, [volume]);

  const seek = useCallback((offset: number, playOriginal = isHot) => {
    const loadAudioFiles = async () => {
      // NB: add songs.length to account for negative offset
      const newSongIndex = (songIndex.current + offset + songs.length) % songs.length;

      songIndex.current = newSongIndex;
      localStorage.setItem('musicIndex', newSongIndex.toString());

      const song = songs[newSongIndex];
      const ambient = new Audio(song.ambient);
      const original = new Audio(song.original);
      const thud = new Audio(song.thud);

      ambient.preload = 'auto';
      original.preload = 'auto';
      thud.preload = 'auto';

      // TODO: handle missing audio

      // wait for all 3 audios to load
      await Promise.all([
        new Promise(resolve => ambient.addEventListener('canplaythrough', resolve, { once: true })),
        new Promise(resolve => original.addEventListener('canplaythrough', resolve, { once: true })),
        new Promise(resolve => thud.addEventListener('canplaythrough', resolve, { once: true }))
      ]);

      const newSongMetadata: SongMetadata = {
        original: original,
        ambient: ambient,
        artist: song.artist,
        thud: thud,
        title: song.title,
        website: song.website,
      };

      return newSongMetadata;
    };

    // call the async load function and set the state after all audio files are loaded
    loadAudioFiles().then(newSongMetadata => {
      setSongMetdata(prevSongMetadata => {
        // ensure existing song is cleaned up
        if (prevSongMetadata) {
          prevSongMetadata.original.pause();
          prevSongMetadata.original.remove();

          prevSongMetadata.ambient.pause();
          prevSongMetadata.ambient.remove();

          prevSongMetadata.thud.pause();
          prevSongMetadata.thud.remove();
        }

        newSongMetadata.original.volume = playOriginal ? volume : 0;
        newSongMetadata.ambient.volume = playOriginal ? 0 : volume;
        newSongMetadata.thud.volume = volume;

        if (isPlaying) {
          newSongMetadata.original.play();
          newSongMetadata.ambient.play();
        }

        return newSongMetadata;
      });
    });
  }, [isHot, isPlaying, volume]);

  // after loading data from localStorage we can initialize the starting song
  useEffect(() => {
    if (mounted) {
      seek(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // NB: separate useEffect for next because seek needs to be called outside of the seek function
  useEffect(() => {
    if (!songMetadata) {
      return;
    }

    const next = () => {
      if (dynamicMusic) {
        seek(1, false);
      } else {
        seek(1);
      }
    };

    songMetadata.original.addEventListener('ended', next);

    return () => songMetadata.original.removeEventListener('ended', next);
  }, [dynamicMusic, seek, songMetadata]);

  const toggleVersion = useCallback((command: 'hot' | 'cold' | 'switch' = 'switch') => {
    if (command === 'hot' && isHot) {
      return;
    }

    if (command === 'cold' && !isHot) {
      return;
    }

    if (intervalRef.current) {
      return;
    }

    const transitionToOriginal = !isHot;

    setIsHot(transitionToOriginal);

    if (!songMetadata || !isPlaying) {
      return;
    }

    setIsToggling(true);

    // play thud sound when changing to original
    if (transitionToOriginal) {
      songMetadata.original.currentTime = songMetadata.ambient.currentTime;
      songMetadata.original.play();
      songMetadata.thud.currentTime = 0;
      songMetadata.thud.play();
    } else {
      songMetadata.ambient.currentTime = songMetadata.original.currentTime;
      songMetadata.ambient.play();
    }

    const duration = 1000; // crossfade duration in ms
    const interval = 100; // interval in ms
    const startOriginalVol = songMetadata.original.volume;
    const startAmbientVol = songMetadata.ambient.volume;
    let progress = 0;

    intervalRef.current = setInterval(() => {
      progress += interval / duration;

      if (!transitionToOriginal) {
        // Crossfade to ambient version
        songMetadata.original.volume = Math.max(0, startOriginalVol * (1 - progress));
        songMetadata.ambient.volume = Math.min(volume, startAmbientVol + (1 - startAmbientVol) * progress);
      } else {
        // Crossfade to original version
        songMetadata.original.volume = Math.min(volume, startOriginalVol + (1 - startOriginalVol) * progress);
        songMetadata.ambient.volume = Math.max(0, startAmbientVol * (1 - progress));
      }

      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        // set volumes to exact values
        songMetadata.original.volume = !transitionToOriginal ? 0 : volume;
        songMetadata.ambient.volume = !transitionToOriginal ? volume : 0;

        if (transitionToOriginal) {
          songMetadata.ambient.pause();
        } else {
          songMetadata.original.pause();
        }

        intervalRef.current = null;
        setIsToggling(false);
      }
    }, interval);
  }, [isHot, isPlaying, setIsHot, songMetadata, volume]);

  return (
    <MusicContext.Provider value={{
      dynamicMusic: dynamicMusic,
      isHot: isHot,
      isMusicSupported: isMusicSupported,
      isPlaying: isPlaying,
      isToggling: isToggling,
      seek: seek,
      setDynamicMusic: setDynamicMusic,
      setIsPlaying: setIsPlaying,
      setVolume: setVolume,
      songMetadata: songMetadata,
      toggleVersion: toggleVersion,
      volume: volume,
    }}>
      {children}
    </MusicContext.Provider>
  );
}
