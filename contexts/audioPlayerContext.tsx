import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface AudioPlayerContextInterface {
  dynamicMusic: boolean;
  isHot: boolean;
  isPlaying: boolean;
  seek: (offset: number) => void;
  setDynamicMusic: React.Dispatch<React.SetStateAction<boolean>>;
  setIsHot: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  songMetadata?: SongMetadata;
  toggleVersion?: (command: 'hot'|'cool'|'switch') => void;
  volume: number;
}

export const AudioPlayerContext = createContext<AudioPlayerContextInterface>({
  dynamicMusic: false,
  isHot: false,
  isPlaying: false,
  seek: () => {},
  setDynamicMusic: () => {},
  setIsHot: () => {},
  setIsPlaying: () => {},
  setVolume: () => {},
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

export default function AudioPlayerContextProvider({ children }: { children: React.ReactNode }) {
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const loadedMetadata = useRef(false);
  const songIndex = useRef(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const LS_dynamicMusic = localStorage.getItem('audio.dynamicMusic');
    const LS_isHot = localStorage.getItem('audio.isHot');
    const LS_songIndex = localStorage.getItem('audio.songIndex');
    const LS_volume = localStorage.getItem('audio.volume');

    LS_isHot && setIsHot(LS_isHot === 'true');
    LS_dynamicMusic && setDynamicMusic(LS_dynamicMusic === 'true');
    LS_volume && setVolume(parseFloat(LS_volume));

    if (LS_songIndex) {
      songIndex.current = parseInt(LS_songIndex);
    }

    // initialize the starting song
    seek(songIndex.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('audio.dynamicMusic', dynamicMusic.toString());
    localStorage.setItem('audio.isHot', isHot.toString());
    localStorage.setItem('audio.volume', volume.toString());
  }, [dynamicMusic, isHot, volume]);

  const seek = useCallback((offset: number) => {
    // ensure any playing song is paused
    if (songMetadata) {
      songMetadata.active.pause();
      songMetadata.ambient.pause();
      songMetadata.active.remove();
      songMetadata.ambient.remove();
    }

    songIndex.current = (songIndex.current + offset) % songs.length;
    localStorage.setItem('audio.songIndex', songIndex.current.toString());

    const song = songs[songIndex.current];
    const active = new Audio(song.active);
    const ambient = new Audio(song.ambient);

    active.volume = isHot ? volume : 0;
    ambient.volume = isHot ? 0 : volume;
    active.currentTime = 0;
    ambient.currentTime = 0;
    loadedMetadata.current = false;

    const onLoadedMetadata = () => {
      // NB: first song that loads will stop here, second song will play both at once
      if (!loadedMetadata.current) {
        loadedMetadata.current = true;

        return;
      }

      active.volume = isHot ? volume : 0;
      ambient.volume = isHot ? 0 : volume;
      active.currentTime = 0;
      ambient.currentTime = 0;

      if (isPlaying) {
        active.play();
        ambient.play();
      }
    };

    ambient.addEventListener('loadedmetadata', onLoadedMetadata);
    active.addEventListener('loadedmetadata', onLoadedMetadata);

    const next = () => {
      // TODO: should this stay hot until you enter a new level page?
      if (dynamicMusic) {
        setIsHot(false);
      }

      seek(1);
    };

    // both tracks are playing at the same time so only need to check if one has ended
    active.addEventListener('ended', next);

    setSongMetdata({
      active: active,
      ambient: ambient,
      artist: song.artist,
      title: song.title,
      website: song.website,
    });
  }, [dynamicMusic, isHot, isPlaying, songMetadata, volume]);

  return (
    <AudioPlayerContext.Provider value={{
      dynamicMusic: dynamicMusic,
      isHot: isHot,
      isPlaying: isPlaying,
      seek: seek,
      setDynamicMusic: setDynamicMusic,
      setIsHot: setIsHot,
      setIsPlaying: setIsPlaying,
      setVolume: setVolume,
      songMetadata: songMetadata,
      volume: volume,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
