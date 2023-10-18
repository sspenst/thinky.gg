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

const songs = [
  // TODO: add all songs
  {
    ambient: '/sounds/music/01,10.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/01,10.ogg',
    thud: '/sounds/music/01,10.ogg',
    title: 'Pink and Orange',
    website: 'https://www.timhalbert.com/',
  },
  {
    ambient: '/sounds/music/04,07.ogg',
    artist: 'Tim Halbert',
    original: '/sounds/music/04,07.ogg',
    thud: '/sounds/music/04,07.ogg',
    title: 'Binary Shapes',
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
  const loadedAudioIndex = useRef(-1);
  const songIndex = useRef(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const audio = new Audio();
    const canPlayOgg = audio.canPlayType('audio/ogg') !== '';

    setIsMusicSupported(canPlayOgg);
    audio.remove();

    if (canPlayOgg) {
      // initialize the starting song
      seek(songIndex.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seek = useCallback((offset: number, playOriginal = isHot) => {
    const onCanplaythrough = () => {
      loadedAudioIndex.current++;

      // need to load ambient, original, and thud before continuing
      if (loadedAudioIndex.current !== 3) {
        return;
      }

      original.volume = playOriginal ? volume : 0;
      ambient.volume = playOriginal ? 0 : volume;

      if (isPlaying) {
        original.play();
        ambient.play();
      }
    };

    // ensure existing song is cleaned up
    if (songMetadata) {
      songMetadata.original.pause();
      songMetadata.original.removeEventListener('canplaythrough', onCanplaythrough);
      songMetadata.original.remove();

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

    const ambient = new Audio(song.ambient);
    const original = new Audio(song.original);
    const thud = new Audio(song.thud);

    ambient.preload = 'auto';
    original.preload = 'auto';
    thud.preload = 'auto';

    loadedAudioIndex.current = 0;

    // both tracks are playing at the same time so only need to check if one has ended
    ambient.addEventListener('canplaythrough', onCanplaythrough);
    original.addEventListener('canplaythrough', onCanplaythrough);
    thud.addEventListener('canplaythrough', onCanplaythrough);

    setSongMetdata({
      original: original,
      ambient: ambient,
      artist: song.artist,
      thud: thud,
      title: song.title,
      website: song.website,
    });
  }, [isHot, isPlaying, songMetadata, volume]);

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
