import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface MusicContextInterface {
  dynamicMusic: boolean;
  isHot: boolean;
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
  activeMp3: string;
  activeOgg: string;
  ambientMp3: string;
  ambientOgg: string;
  thudMp3: string;
  thudOgg: string;
}

interface SongMetadata extends BaseSongMetadata {
  active: HTMLAudioElement;
  ambient: HTMLAudioElement;
  thud: HTMLAudioElement;
}

const songs = [
  // TODO: add all songs
  {
    activeMp3: '/sounds/music/01.mp3',
    activeOgg: '/sounds/music/01,10.ogg',
    ambientMp3: '/sounds/music/01_ambient.mp3',
    ambientOgg: '/sounds/music/01,10.ogg',
    artist: 'Tim Halbert',
    thudMp3: '/sounds/music/01.mp3',
    thudOgg: '/sounds/music/01,10.ogg',
    title: 'Pink and Orange',
    website: 'https://www.timhalbert.com/',
  },
  {
    activeMp3: '/sounds/music/07.mp3',
    activeOgg: '/sounds/music/04,07.ogg',
    ambientMp3: '/sounds/music/07_ambient.mp3',
    ambientOgg: '/sounds/music/04,07.ogg',
    artist: 'Tim Halbert',
    thudMp3: '/sounds/music/07.mp3',
    thudOgg: '/sounds/music/04,07.ogg',
    title: 'Binary Shapes',
    website: 'https://www.timhalbert.com/',
  },
] as InitialSongMetadata[];

export default function MusicContextProvider({ children }: { children: React.ReactNode }) {
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const loadedAudioIndex = useRef(-1);
  const songIndex = useRef(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    // initialize the starting song
    seek(songIndex.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((offset: number, isActive = isHot) => {
    const onCanplaythrough = () => {
      loadedAudioIndex.current++;

      // need to load active, ambient, and thud before continuing
      if (loadedAudioIndex.current !== 3) {
        return;
      }

      active.volume = isActive ? volume : 0;
      ambient.volume = isActive ? 0 : volume;

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

      songMetadata.thud.pause();
      songMetadata.thud.removeEventListener('canplaythrough', onCanplaythrough);
      songMetadata.thud.remove();
    }

    // NB: add songs.length to account for negative offset
    songIndex.current = (songIndex.current + offset + songs.length) % songs.length;

    const song = songs[songIndex.current];

    const active = new Audio();
    const ambient = new Audio();
    const thud = new Audio();

    if (active.canPlayType('audio/ogg') !== '') {
      active.src = song.activeOgg;
      ambient.src = song.ambientOgg;
      thud.src = song.thudOgg;
    } else {
      active.src = song.activeMp3;
      ambient.src = song.ambientMp3;
      thud.src = song.thudMp3;
    }

    active.preload = 'auto';
    ambient.preload = 'auto';
    thud.preload = 'auto';

    loadedAudioIndex.current = 0;

    // both tracks are playing at the same time so only need to check if one has ended
    active.addEventListener('canplaythrough', onCanplaythrough);
    ambient.addEventListener('canplaythrough', onCanplaythrough);
    thud.addEventListener('canplaythrough', onCanplaythrough);

    setSongMetdata({
      active: active,
      ambient: ambient,
      artist: song.artist,
      thud: thud,
      title: song.title,
      website: song.website,
    });
  }, [isHot, isPlaying, songMetadata, volume]);

  // NB: separate useEffect for next because seek needs to be called outside of the seek function
  useEffect(() => {
    const next = () => {
      if (dynamicMusic) {
        seek(1, false);
      } else {
        seek(1);
      }
    };

    if (!songMetadata) {
      return;
    }

    songMetadata.active.addEventListener('ended', next);

    return () => songMetadata.active.removeEventListener('ended', next);
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

    const transitionToActive = !isHot;

    setIsHot(transitionToActive);

    if (!songMetadata || !isPlaying) {
      return;
    }

    setIsToggling(true);

    // play thud sound when changing to active
    if (transitionToActive) {
      songMetadata.active.currentTime = songMetadata.ambient.currentTime;
      songMetadata.active.play();
      songMetadata.thud.currentTime = 0;
      songMetadata.thud.play();
    } else {
      songMetadata.ambient.currentTime = songMetadata.active.currentTime;
      songMetadata.ambient.play();
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

      if (progress >= 1) {
        clearInterval(intervalRef.current!);
        // set volumes to exact values
        songMetadata.active.volume = !transitionToActive ? 0 : volume;
        songMetadata.ambient.volume = !transitionToActive ? volume : 0;

        if (transitionToActive) {
          songMetadata.ambient.pause();
        } else {
          songMetadata.active.pause();
        }

        intervalRef.current = null;
        setIsToggling(false);
      }
    }, step * 1000);
  }, [isHot, isPlaying, setIsHot, songMetadata, volume]);

  return (
    <MusicContext.Provider value={{
      dynamicMusic: dynamicMusic,
      isHot: isHot,
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
