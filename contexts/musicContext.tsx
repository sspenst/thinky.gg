import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface MusicContextInterface {
  crossfadeProgress: number;
  dynamicMusic: boolean;
  isHot: boolean;
  isPlaying: boolean;
  seek: (offset: number) => void;
  setDynamicMusic: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  songMetadata?: SongMetadata;
  toggleVersion: (command?: 'hot' | 'cold' | 'switch') => void;
  volume: number;
}

export const MusicContext = createContext<MusicContextInterface>({
  crossfadeProgress: 1,
  dynamicMusic: false,
  isHot: false,
  isPlaying: false,
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
  active: string;
  ambient: string;
}

interface SongMetadata extends BaseSongMetadata {
  active: HTMLAudioElement;
  ambient: HTMLAudioElement;
}

const songs = [
  {
    active: '/sounds/music/01.mp3',
    ambient: '/sounds/music/01_ambient.mp3',
    artist: 'Tim Halbert',
    title: 'Pink and Orange',
    website: 'https://www.timhalbert.com/',
  },
  {
    active: '/sounds/music/07.mp3',
    ambient: '/sounds/music/07_ambient.mp3',
    artist: 'Tim Halbert',
    title: 'Binary Shapes',
    website: 'https://www.timhalbert.com/',
  },
  /*{
    title: 'Test',
    active: '/sounds/music/test1high.mp3',
    ambient: '/sounds/music/test1.mp3',
    artist: 'Danny',
    website: 'k2xl.com'
  },*/
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
  // Add more songs here
] as InitialSongMetadata[];

export default function MusicContextProvider({ children }: { children: React.ReactNode }) {
  const [crossfadeProgress, setCrossfadeProgress] = useState(1);
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const loadedAudioIndex = useRef(-1);
  const songIndex = useRef(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    // initialize the starting song
    seek(songIndex.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((offset: number) => {
    const onCanplaythrough = () => {
      // NB: first song that loads will stop here, second song will play both at once
      if (loadedAudioIndex.current !== songIndex.current) {
        loadedAudioIndex.current = songIndex.current;

        return;
      }

      active.volume = isHot ? volume : 0;
      ambient.volume = isHot ? 0 : volume;

      if (isPlaying) {
        active.play();
        ambient.play();
      }
    };

    // ensure existing song is cleaned up
    if (songMetadata) {
      songMetadata.active.pause();
      songMetadata.active.removeEventListener('canplaythrough', onCanplaythrough);
      songMetadata.active.remove();

      songMetadata.ambient.pause();
      songMetadata.ambient.removeEventListener('canplaythrough', onCanplaythrough);
      songMetadata.ambient.remove();
    }

    // NB: add songs.length to account for negative offset
    songIndex.current = (songIndex.current + offset + songs.length) % songs.length;

    const song = songs[songIndex.current];
    const active = new Audio(song.active);
    const ambient = new Audio(song.ambient);

    active.preload = 'auto';
    ambient.preload = 'auto';
    loadedAudioIndex.current = -1;

    // both tracks are playing at the same time so only need to check if one has ended
    active.addEventListener('canplaythrough', onCanplaythrough);
    ambient.addEventListener('canplaythrough', onCanplaythrough);

    setSongMetdata({
      active: active,
      ambient: ambient,
      artist: song.artist,
      title: song.title,
      website: song.website,
    });
  }, [isHot, isPlaying, songMetadata, volume]);

  // NB: separate useEffect for next because seek needs to be called outside of the seek function
  useEffect(() => {
    const next = () => seek(1);

    if (!songMetadata) {
      return;
    }

    songMetadata.active.addEventListener('ended', next);

    return () => songMetadata.active.removeEventListener('ended', next);
  }, [seek, songMetadata]);

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

    const transitionToActive = !isHot;

    setIsHot(transitionToActive);

    if (!songMetadata) {
      return;
    }

    const duration = 1; // crossfade duration in seconds
    const step = 0.01; // step size
    const startActiveVol = songMetadata.active.volume;
    const startAmbientVol = songMetadata.ambient.volume;
    let progress = 0;

    intervalRef.current = setInterval(() => {
      progress += step / duration;

      if (!transitionToActive) {
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
        songMetadata.active.volume = !transitionToActive ? 0 : volume;
        songMetadata.ambient.volume = !transitionToActive ? volume : 0;
        intervalRef.current = null;
      }
    }, step * 1000);
  }, [isHot, setIsHot, songMetadata, volume]);

  return (
    <MusicContext.Provider value={{
      crossfadeProgress: crossfadeProgress,
      dynamicMusic: dynamicMusic,
      isHot: isHot,
      isPlaying: isPlaying,
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
