import { GameId } from '@root/constants/GameId';
import useUrl from '@root/hooks/useUrl';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export interface MusicContextInterface {
  isDynamic: boolean;
  isDynamicSupported: boolean;
  isHot: boolean;
  isPlaying: boolean;
  isSeeking: boolean;
  isToggling: boolean;
  seek: (offset: number) => void;
  seekByIndex: (index: number) => void;
  setIsDynamic: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  songMetadata?: SongMetadata;
  toggleVersion: (command?: 'hot' | 'cold' | 'switch') => void;
  volume: number;
}

export const MusicContext = createContext<MusicContextInterface>({
  isDynamic: false,
  isDynamicSupported: false,
  isHot: false,
  isPlaying: false,
  isSeeking: false,
  isToggling: false,
  seek: () => {},
  seekByIndex: () => {},
  setIsDynamic: () => {},
  setIsPlaying: () => {},
  setVolume: () => {},
  toggleVersion: () => {},
  volume: 0,
});

interface BaseSongMetadata {
  artist: string;
  artistHref: string;
  title: string;
}

interface InitialSongMetadata extends BaseSongMetadata {
  ambient: string;
  original: string;
  originalMp3: string;
  thud: string;
}

interface SongMetadata extends BaseSongMetadata {
  ambient?: HTMLAudioElement;
  original?: HTMLAudioElement;
  originalMp3?: HTMLAudioElement;
  thud?: HTMLAudioElement;
}

export const songs = [
  {
    ambient: '/sounds/music/ambient/01.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/01.ogg',
    originalMp3: '/sounds/music/originalMp3/01.mp3',
    thud: '/sounds/music/thud/01,10.ogg',
    title: 'Pink and Orange',
  },
  {
    ambient: '/sounds/music/ambient/02.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/02.ogg',
    originalMp3: '/sounds/music/originalMp3/02.mp3',
    thud: '/sounds/music/thud/02.ogg',
    title: 'No Chance in Hell',
  },
  {
    ambient: '/sounds/music/ambient/03.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/03.ogg',
    originalMp3: '/sounds/music/originalMp3/03.mp3',
    thud: '/sounds/music/thud/03.ogg',
    title: 'The Exchange',
  },
  {
    ambient: '/sounds/music/ambient/04.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/04.ogg',
    originalMp3: '/sounds/music/originalMp3/04.mp3',
    thud: '/sounds/music/thud/04,07.ogg',
    title: 'Automaton',
  },
  {
    ambient: '/sounds/music/ambient/05.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/05.ogg',
    originalMp3: '/sounds/music/originalMp3/05.mp3',
    thud: '/sounds/music/thud/05.ogg',
    title: 'Treason',
  },
  {
    ambient: '/sounds/music/ambient/06.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/06.ogg',
    originalMp3: '/sounds/music/originalMp3/06.mp3',
    thud: '/sounds/music/thud/06.ogg',
    title: 'Insecticide',
  },
  {
    ambient: '/sounds/music/ambient/07.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/07.ogg',
    originalMp3: '/sounds/music/originalMp3/07.mp3',
    thud: '/sounds/music/thud/04,07.ogg',
    title: 'Binary Shapes',
  },
  {
    ambient: '/sounds/music/ambient/08.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/08.ogg',
    originalMp3: '/sounds/music/originalMp3/08.mp3',
    thud: '/sounds/music/thud/08,09.ogg',
    title: 'Peaceful Encounter',
  },
  {
    ambient: '/sounds/music/ambient/09.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/09.ogg',
    originalMp3: '/sounds/music/originalMp3/09.mp3',
    thud: '/sounds/music/thud/08,09.ogg',
    title: 'Flatlander',
  },
  {
    ambient: '/sounds/music/ambient/10.ogg',
    artist: 'Tim Halbert',
    artistHref: 'https://www.timhalbert.com/',
    original: '/sounds/music/original/10.ogg',
    originalMp3: '/sounds/music/originalMp3/10.mp3',
    thud: '/sounds/music/thud/01,10.ogg',
    title: 'Anx',
  },
] as InitialSongMetadata[];

export default function MusicContextProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isDynamic, setIsDynamic] = useState(true);
  // dynamic audio uses 3 ogg audio layers
  // non-dynamic only uses mp3 originals (safari/ios)
  const [isDynamicSupported, setIsDynamicSupported] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [songIndex, setSongIndex] = useState(0);
  const [songMetadata, setSongMetdata] = useState<SongMetadata>();
  const [volume, setVolume] = useState(0.66);

  const getUrl = useUrl();

  useEffect(() => {
    const audio = new Audio();
    const canPlayOgg = audio.canPlayType('audio/ogg') !== '';

    setIsDynamicSupported(canPlayOgg);
    audio.remove();

    const lsDynamic = localStorage.getItem('musicDynamic');
    const lsHot = localStorage.getItem('musicHot');
    const lsIndex = localStorage.getItem('musicIndex');
    const lsVolume = localStorage.getItem('musicVolume');

    let dynamic = true;

    if (lsDynamic !== null) {
      dynamic = lsDynamic === 'true';
    }

    if (!canPlayOgg) {
      dynamic = false;
    }

    setIsDynamic(dynamic);

    let hot = false;

    if (lsHot !== null) {
      hot = lsHot === 'true';
    }

    if (!canPlayOgg) {
      hot = true;
    }

    setIsHot(hot);

    if (lsIndex !== null) {
      setSongIndex(parseInt(lsIndex));
    }

    if (lsVolume !== null) {
      setVolume(parseFloat(lsVolume));
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('musicDynamic', isDynamic.toString());
  }, [isDynamic]);

  useEffect(() => {
    localStorage.setItem('musicHot', isHot.toString());
  }, [isHot]);

  useEffect(() => {
    localStorage.setItem('musicIndex', songIndex.toString());
  }, [songIndex]);

  useEffect(() => {
    localStorage.setItem('musicVolume', volume.toString());
  }, [volume]);

  const seekByIndex = useCallback((index: number, playOriginal = isHot) => {
    // must be a valid index
    if (index < 0 || index >= songs.length) {
      index = 0;
    }

    setIsSeeking(true);

    const loadAudioFiles = async () => {
      function canPlayThrough(audio: HTMLAudioElement) {
        return new Promise(resolve => {
          function handleCanPlayThrough() {
            audio.removeEventListener('error', handleError);
            resolve(true);
          }

          function handleError() {
            audio.removeEventListener('canplaythrough', handleCanPlayThrough);
            resolve(false);
          }

          audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
          audio.addEventListener('error', handleError, { once: true });
        });
      }

      setSongIndex(index);

      const song = songs[index];
      const newSongMetadata: SongMetadata = {
        artist: song.artist,
        artistHref: song.artistHref,
        title: song.title,
      };

      if (isDynamicSupported) {
        const ambient = new Audio(getUrl(GameId.THINKY, song.ambient));
        const original = new Audio(getUrl(GameId.THINKY, song.original));
        const thud = new Audio(getUrl(GameId.THINKY, song.thud));

        ambient.preload = 'auto';
        original.preload = 'auto';
        thud.preload = 'auto';

        ambient.load();
        original.load();
        thud.load();

        const [canPlayAmbient, canPlayOriginal, canPlayThud] = await Promise.all([
          canPlayThrough(ambient),
          canPlayThrough(original),
          canPlayThrough(thud),
        ]);

        if (canPlayAmbient) {
          newSongMetadata.ambient = ambient;
        }

        if (canPlayOriginal) {
          newSongMetadata.original = original;
        }

        if (canPlayThud) {
          newSongMetadata.thud = thud;
        }
      } else {
        const originalMp3 = new Audio(song.originalMp3);

        originalMp3.preload = 'auto';
        originalMp3.load();

        const canPlayOriginalMp3 = await canPlayThrough(originalMp3);

        if (canPlayOriginalMp3) {
          newSongMetadata.originalMp3 = originalMp3;
        }
      }

      return newSongMetadata;
    };

    // call the async load function and set the state after all audio files are loaded
    loadAudioFiles().then(newSongMetadata => {
      setSongMetdata(prevSongMetadata => {
        // ensure existing song is cleaned up
        if (prevSongMetadata) {
          prevSongMetadata.original?.pause();
          prevSongMetadata.original?.remove();

          prevSongMetadata.ambient?.pause();
          prevSongMetadata.ambient?.remove();

          prevSongMetadata.thud?.pause();
          prevSongMetadata.thud?.remove();

          prevSongMetadata.originalMp3?.pause();
          prevSongMetadata.originalMp3?.remove();
        }

        // set volume for new audio
        if (newSongMetadata.original) {
          newSongMetadata.original.volume = playOriginal ? volume : 0;
        }

        if (newSongMetadata.ambient) {
          newSongMetadata.ambient.volume = playOriginal ? 0 : volume;
        }

        if (newSongMetadata.thud) {
          newSongMetadata.thud.volume = volume;
        }

        if (newSongMetadata.originalMp3) {
          newSongMetadata.originalMp3.volume = volume;
        }

        if (isPlaying) {
          newSongMetadata.original?.play();
          newSongMetadata.ambient?.play();
          newSongMetadata.originalMp3?.play();
        }

        setIsSeeking(false);

        return newSongMetadata;
      });
    });
  }, [getUrl, isDynamicSupported, isHot, isPlaying, volume]);

  const seek = useCallback((offset: number, playOriginal = isHot) => {
    // add songs.length to account for negative offset
    let positiveOffset = offset + songs.length;

    if (positiveOffset < 0) {
      positiveOffset = 0;
    }

    const newSongIndex = (songIndex + positiveOffset) % songs.length;

    seekByIndex(newSongIndex, playOriginal);
  }, [isHot, seekByIndex, songIndex]);

  // after loading data from localStorage we can initialize the starting song
  useEffect(() => {
    if (mounted) {
      seekByIndex(songIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // NB: separate useEffect for next because seek needs to be called outside of the seek function
  useEffect(() => {
    if (!songMetadata) {
      return;
    }

    const next = () => {
      if (isDynamic) {
        seek(1, false);
      } else {
        seek(1);
      }
    };

    songMetadata.original?.addEventListener('ended', next);
    songMetadata.originalMp3?.addEventListener('ended', next);

    return () => {
      songMetadata.original?.removeEventListener('ended', next);
      songMetadata.originalMp3?.removeEventListener('ended', next);
    };
  }, [isDynamic, seek, songMetadata]);

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

    if (!isDynamicSupported) {
      return;
    }

    const transitionToOriginal = !isHot;

    setIsHot(transitionToOriginal);

    if (!isPlaying || !songMetadata || !songMetadata.original || !songMetadata.ambient) {
      return;
    }

    setIsToggling(true);

    // play thud sound when changing to original
    if (transitionToOriginal) {
      songMetadata.original.currentTime = songMetadata.ambient.currentTime;
      songMetadata.original.play();

      if (songMetadata.thud) {
        songMetadata.thud.currentTime = 0;
        songMetadata.thud.play();
      }
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

      if (!songMetadata.original || !songMetadata.ambient) {
        return;
      }

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
  }, [isDynamicSupported, isHot, isPlaying, setIsHot, songMetadata, volume]);

  return (
    <MusicContext.Provider value={{
      isDynamic: isDynamic,
      isDynamicSupported: isDynamicSupported,
      isHot: isHot,
      isPlaying: isPlaying,
      isSeeking: isSeeking,
      isToggling: isToggling,
      seek: seek,
      seekByIndex: seekByIndex,
      setIsDynamic: setIsDynamic,
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
