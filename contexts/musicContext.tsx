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
  ambientReady?: boolean;
  original?: HTMLAudioElement;
  originalReady?: boolean;
  originalMp3?: HTMLAudioElement;
  thud?: HTMLAudioElement;
}

type AudioReadiness = 'failed' | 'ready' | 'timeout';
type AudioLayer = 'ambient' | 'original' | 'originalMp3' | 'thud';
type LateAudioReadiness = Exclude<AudioReadiness, 'timeout'>;

export function waitUntilPlayable(
  audio: HTMLAudioElement,
  onLateReadiness?: (readiness: LateAudioReadiness) => void,
) {
  return new Promise<AudioReadiness>(resolve => {
    let resolved = false;
    let listening = true;

    function cleanup() {
      if (!listening) {
        return;
      }

      listening = false;
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleLoadFailure);
      audio.removeEventListener('abort', handleLoadFailure);
      clearTimeout(timeout);
    }

    function finish(readiness: AudioReadiness) {
      if (!listening) {
        return;
      }

      if (readiness === 'timeout') {
        if (resolved) {
          return;
        }

        resolved = true;
        resolve(readiness);

        return;
      }

      cleanup();

      if (!resolved) {
        resolved = true;
        resolve(readiness);

        return;
      }

      onLateReadiness?.(readiness);
    }

    function handleCanPlay() {
      finish('ready');
    }

    function handleLoadFailure() {
      finish('failed');
    }

    // Release loading controls after 15 seconds, but keep listening so a slow
    // response can repair readiness (or a late failure can remove the layer).
    const timeout = setTimeout(() => finish('timeout'), 15000);

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleLoadFailure);
    audio.addEventListener('abort', handleLoadFailure);

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      finish('ready');
    }
  });
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

function createSongMetadata(index: number): SongMetadata {
  const song = songs[index];

  return {
    artist: song.artist,
    artistHref: song.artistHref,
    title: song.title,
  };
}

function forEachAudio(songMetadata: SongMetadata | undefined, callback: (audio: HTMLAudioElement) => void) {
  if (!songMetadata) {
    return;
  }

  [
    songMetadata.original,
    songMetadata.ambient,
    songMetadata.thud,
    songMetadata.originalMp3,
  ].forEach(audio => {
    if (audio) {
      callback(audio);
    }
  });
}

function pauseSong(songMetadata: SongMetadata | undefined) {
  forEachAudio(songMetadata, audio => audio.pause());
}

function setSongVolumes(songMetadata: SongMetadata | undefined, playOriginal: boolean, volume: number) {
  if (!songMetadata) {
    return;
  }

  const onlyAmbientIsReady = songMetadata.ambientReady === true && songMetadata.originalReady === false;
  const onlyOriginalIsReady = songMetadata.originalReady === true && songMetadata.ambientReady === false;

  if (songMetadata.original) {
    songMetadata.original.volume = onlyOriginalIsReady || (!onlyAmbientIsReady && (!songMetadata.ambient || playOriginal))
      ? volume
      : 0;
  }

  if (songMetadata.ambient) {
    songMetadata.ambient.volume = onlyAmbientIsReady || (!onlyOriginalIsReady && (!songMetadata.original || !playOriginal))
      ? volume
      : 0;
  }

  if (songMetadata.thud) {
    songMetadata.thud.volume = volume;
  }

  if (songMetadata.originalMp3) {
    songMetadata.originalMp3.volume = volume;
  }
}

async function playAudio(audio: HTMLAudioElement | undefined) {
  if (!audio) {
    return false;
  }

  try {
    await audio.play();

    return true;
  } catch {
    return false;
  }
}

async function playSong(songMetadata: SongMetadata | undefined) {
  const playbackResults = await Promise.all([
    playAudio(songMetadata?.original),
    playAudio(songMetadata?.ambient),
    playAudio(songMetadata?.originalMp3),
  ]);

  return playbackResults.some(Boolean);
}

function removeAudio(audio: HTMLAudioElement) {
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  audio.remove();
}

function removeSong(songMetadata: SongMetadata | undefined) {
  forEachAudio(songMetadata, removeAudio);
}

function hasPlayableAudio(songMetadata: SongMetadata | undefined) {
  return Boolean(
    songMetadata?.original ||
    songMetadata?.ambient ||
    songMetadata?.originalMp3
  );
}

export interface PlaylistEndSources {
  ambient?: HTMLAudioElement;
  ambientReady?: boolean;
  original?: HTMLAudioElement;
  originalMp3?: HTMLAudioElement;
  originalReady?: boolean;
}

export function getPlaylistEndSources(songMetadata: PlaylistEndSources | undefined) {
  if (!songMetadata) {
    return [];
  }

  if (songMetadata.originalMp3) {
    return [songMetadata.originalMp3];
  }

  const readySources = [
    songMetadata.originalReady === true ? songMetadata.original : undefined,
    songMetadata.ambientReady === true ? songMetadata.ambient : undefined,
  ].filter((audio): audio is HTMLAudioElement => Boolean(audio));

  if (readySources.length > 0) {
    return readySources;
  }

  return [songMetadata.original, songMetadata.ambient]
    .filter((audio): audio is HTMLAudioElement => Boolean(audio));
}

export default function MusicContextProvider({ children }: { children: React.ReactNode }) {
  const activeLoadRef = useRef(0);
  const activeSongRef = useRef<SongMetadata | undefined>(undefined);
  const endedLoadRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackAttemptRef = useRef(0);
  const readyLoadRef = useRef<number | null>(null);
  const [isDynamic, setIsDynamic] = useState(true);
  // dynamic audio uses 3 ogg audio layers
  // non-dynamic only uses mp3 originals (safari/ios)
  const [isDynamicSupported, setIsDynamicSupported] = useState(false);
  const [isHot, setIsHotState] = useState(false);
  const isHotRef = useRef(false);
  const [isPlaying, setIsPlayingState] = useState(false);
  const isPlayingRef = useRef(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [songIndex, setSongIndex] = useState(0);
  const [songMetadata, setSongMetadata] = useState<SongMetadata>(() => createSongMetadata(0));
  const [volume, setVolumeState] = useState(0.66);
  const volumeRef = useRef(0.66);

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

    isHotRef.current = hot;
    setIsHotState(hot);

    if (lsIndex !== null) {
      const storedIndex = Number.parseInt(lsIndex, 10);

      if (storedIndex >= 0 && storedIndex < songs.length) {
        setSongIndex(storedIndex);
        setSongMetadata(createSongMetadata(storedIndex));
      }
    }

    if (lsVolume !== null) {
      const storedVolume = Number.parseFloat(lsVolume);

      if (Number.isFinite(storedVolume)) {
        volumeRef.current = storedVolume;
        setVolumeState(storedVolume);
      }
    }
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

  const setVolume = useCallback<React.Dispatch<React.SetStateAction<number>>>((value) => {
    const newVolume = typeof value === 'function' ? value(volumeRef.current) : value;

    volumeRef.current = newVolume;
    setVolumeState(newVolume);
    setSongVolumes(activeSongRef.current, isHotRef.current, newVolume);
  }, []);

  const playSongAndRecover = useCallback((metadata: SongMetadata | undefined) => {
    const playbackAttempt = playbackAttemptRef.current + 1;

    playbackAttemptRef.current = playbackAttempt;

    void playSong(metadata).then(didPlay => {
      if (
        didPlay ||
        playbackAttemptRef.current !== playbackAttempt ||
        !isPlayingRef.current
      ) {
        return;
      }

      isPlayingRef.current = false;
      setIsPlayingState(false);
      pauseSong(metadata);
    });
  }, []);

  const seekByIndex = useCallback((index: number, playOriginal = isHotRef.current, shouldPlay = isPlayingRef.current) => {
    // must be a valid index
    if (index < 0 || index >= songs.length) {
      index = 0;
    }

    const loadId = activeLoadRef.current + 1;

    activeLoadRef.current = loadId;
    endedLoadRef.current = null;
    readyLoadRef.current = null;
    setIsSeeking(true);
    setSongIndex(index);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsToggling(false);

    removeSong(activeSongRef.current);
    activeSongRef.current = undefined;

    const loadAudioFiles = async () => {
      const song = songs[index];
      const newSongMetadata = createSongMetadata(index);
      let versionReady = false;

      const handleLateReadiness = (
        layer: AudioLayer,
        audio: HTMLAudioElement,
        readiness: LateAudioReadiness,
      ) => {
        if (
          activeLoadRef.current !== loadId ||
          activeSongRef.current !== newSongMetadata ||
          newSongMetadata[layer] !== audio
        ) {
          return;
        }

        if (layer === 'ambient') {
          newSongMetadata.ambientReady = readiness === 'ready';
        } else if (layer === 'original') {
          newSongMetadata.originalReady = readiness === 'ready';
        }

        if (readiness === 'failed') {
          newSongMetadata[layer] = undefined;
          removeAudio(audio);
        }

        setSongVolumes(newSongMetadata, isHotRef.current, volumeRef.current);
        readyLoadRef.current = newSongMetadata.ambientReady && newSongMetadata.originalReady
          ? loadId
          : null;
        setSongMetadata({ ...newSongMetadata });

        if (isPlayingRef.current && !hasPlayableAudio(newSongMetadata)) {
          playbackAttemptRef.current += 1;
          isPlayingRef.current = false;
          setIsPlayingState(false);
        }
      };

      if (isDynamicSupported) {
        const ambient = new Audio();
        const original = new Audio();
        const thud = new Audio();

        ambient.preload = 'auto';
        original.preload = 'auto';
        thud.preload = 'auto';

        ambient.src = song.ambient;
        original.src = song.original;
        thud.src = song.thud;

        newSongMetadata.ambient = ambient;
        newSongMetadata.original = original;
        newSongMetadata.thud = thud;
        setSongVolumes(newSongMetadata, playOriginal, volumeRef.current);

        activeSongRef.current = newSongMetadata;
        setSongMetadata(newSongMetadata);

        const readiness = [
          waitUntilPlayable(ambient, result => handleLateReadiness('ambient', ambient, result)),
          waitUntilPlayable(original, result => handleLateReadiness('original', original, result)),
          waitUntilPlayable(thud, result => handleLateReadiness('thud', thud, result)),
        ];

        ambient.load();
        original.load();
        thud.load();

        if (shouldPlay) {
          playSongAndRecover(newSongMetadata);
        }

        const [ambientReadiness, originalReadiness, thudReadiness] = await Promise.all(readiness);

        newSongMetadata.ambientReady = ambientReadiness === 'ready';
        newSongMetadata.originalReady = originalReadiness === 'ready';

        if (ambientReadiness === 'failed') {
          newSongMetadata.ambient = undefined;
          removeAudio(ambient);
        }

        if (originalReadiness === 'failed') {
          newSongMetadata.original = undefined;
          removeAudio(original);
        }

        if (thudReadiness === 'failed') {
          newSongMetadata.thud = undefined;
          removeAudio(thud);
        }

        versionReady = ambientReadiness === 'ready' && originalReadiness === 'ready';
        setSongVolumes(newSongMetadata, isHotRef.current, volumeRef.current);
      } else {
        const originalMp3 = new Audio();

        originalMp3.preload = 'auto';
        originalMp3.src = song.originalMp3;
        originalMp3.volume = volumeRef.current;

        newSongMetadata.originalMp3 = originalMp3;
        activeSongRef.current = newSongMetadata;
        setSongMetadata(newSongMetadata);

        const readiness = waitUntilPlayable(
          originalMp3,
          result => handleLateReadiness('originalMp3', originalMp3, result),
        );

        originalMp3.load();

        if (shouldPlay) {
          playSongAndRecover(newSongMetadata);
        }

        if (await readiness === 'failed') {
          newSongMetadata.originalMp3 = undefined;
          removeAudio(originalMp3);
        }
      }

      return { newSongMetadata, versionReady };
    };

    // Loading only starts after an explicit playback or seek action.
    loadAudioFiles().then(({ newSongMetadata, versionReady }) => {
      if (activeLoadRef.current !== loadId) {
        removeSong(newSongMetadata);

        return;
      }

      activeSongRef.current = newSongMetadata;
      readyLoadRef.current = versionReady ? loadId : null;
      setSongMetadata({ ...newSongMetadata });
      setIsSeeking(false);

      if (isPlayingRef.current && !hasPlayableAudio(newSongMetadata)) {
        playbackAttemptRef.current += 1;
        isPlayingRef.current = false;
        setIsPlayingState(false);
      }
    }).catch(error => {
      if (activeLoadRef.current !== loadId) {
        return;
      }

      playbackAttemptRef.current += 1;
      readyLoadRef.current = null;
      removeSong(activeSongRef.current);
      activeSongRef.current = undefined;
      isPlayingRef.current = false;
      setIsPlayingState(false);
      setIsSeeking(false);
      setSongMetadata(createSongMetadata(index));
      console.error('Failed to load music:', error);
    });
  }, [isDynamicSupported, playSongAndRecover]);

  const setIsPlaying = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((value) => {
    const nextIsPlaying = typeof value === 'function' ? value(isPlayingRef.current) : value;

    if (nextIsPlaying === isPlayingRef.current) {
      return;
    }

    isPlayingRef.current = nextIsPlaying;
    setIsPlayingState(nextIsPlaying);

    if (!nextIsPlaying) {
      playbackAttemptRef.current += 1;
      pauseSong(activeSongRef.current);

      return;
    }

    if (hasPlayableAudio(activeSongRef.current)) {
      playSongAndRecover(activeSongRef.current);
    } else {
      seekByIndex(songIndex, isHotRef.current, true);
    }
  }, [playSongAndRecover, seekByIndex, songIndex]);

  const seek = useCallback((offset: number, playOriginal = isHotRef.current) => {
    // add songs.length to account for negative offset
    let positiveOffset = offset + songs.length;

    if (positiveOffset < 0) {
      positiveOffset = 0;
    }

    const newSongIndex = (songIndex + positiveOffset) % songs.length;

    seekByIndex(newSongIndex, playOriginal);
  }, [seekByIndex, songIndex]);

  useEffect(() => {
    return () => {
      activeLoadRef.current += 1;
      playbackAttemptRef.current += 1;
      readyLoadRef.current = null;
      const activeSong = activeSongRef.current;

      activeSongRef.current = undefined;
      removeSong(activeSong);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // NB: separate useEffect for next because seek needs to be called outside of the seek function
  useEffect(() => {
    if (!songMetadata) {
      return;
    }

    const loadId = activeLoadRef.current;
    const endSources = getPlaylistEndSources(songMetadata);

    const next = () => {
      if (activeLoadRef.current !== loadId || endedLoadRef.current === loadId) {
        return;
      }

      endedLoadRef.current = loadId;

      if (isDynamic) {
        seek(1, false);
      } else {
        seek(1);
      }
    };

    endSources.forEach(endSource => endSource.addEventListener('ended', next));

    return () => {
      endSources.forEach(endSource => endSource.removeEventListener('ended', next));
    };
  }, [isDynamic, seek, songMetadata]);

  const toggleVersion = useCallback((command: 'hot' | 'cold' | 'switch' = 'switch') => {
    if (command === 'hot' && isHotRef.current) {
      return;
    }

    if (command === 'cold' && !isHotRef.current) {
      return;
    }

    if (intervalRef.current || isToggling) {
      return;
    }

    if (!isDynamicSupported) {
      return;
    }

    const transitionToOriginal = !isHotRef.current;
    const activeMetadata = activeSongRef.current;
    const loadId = activeLoadRef.current;

    // Hot/cold is a durable preference, even when the current media cannot
    // crossfade. A later readiness update or seek applies the latest choice.
    isHotRef.current = transitionToOriginal;
    setIsHotState(transitionToOriginal);

    if (!isPlayingRef.current) {
      setSongVolumes(activeMetadata, transitionToOriginal, volumeRef.current);

      return;
    }

    if (
      isSeeking ||
      readyLoadRef.current !== loadId ||
      !activeMetadata?.original ||
      !activeMetadata.ambient
    ) {
      setSongVolumes(activeMetadata, transitionToOriginal, volumeRef.current);

      return;
    }

    const original = activeMetadata.original;
    const ambient = activeMetadata.ambient;
    const target = transitionToOriginal ? original : ambient;

    target.currentTime = transitionToOriginal ? ambient.currentTime : original.currentTime;
    setIsToggling(true);

    void playAudio(target).then(didPlay => {
      if (activeLoadRef.current !== loadId || activeSongRef.current !== activeMetadata) {
        return;
      }

      if (!isPlayingRef.current) {
        target.pause();
        setIsToggling(false);

        return;
      }

      if (!didPlay) {
        setIsToggling(false);

        return;
      }

      if (transitionToOriginal && activeMetadata.thud) {
        activeMetadata.thud.currentTime = 0;
        void playAudio(activeMetadata.thud);
      }

      const duration = 1000; // crossfade duration in ms
      const interval = 100; // interval in ms
      const startOriginalVol = original.volume;
      const startAmbientVol = ambient.volume;
      let progress = 0;

      const intervalId = setInterval(() => {
        progress += interval / duration;

        if (
          activeLoadRef.current !== loadId ||
          activeSongRef.current !== activeMetadata ||
          !activeMetadata.original ||
          !activeMetadata.ambient
        ) {
          clearInterval(intervalId);

          if (intervalRef.current === intervalId) {
            intervalRef.current = null;
          }

          setIsToggling(false);

          return;
        }

        if (!transitionToOriginal) {
          // Crossfade to ambient version
          original.volume = Math.max(0, startOriginalVol * (1 - progress));
          ambient.volume = Math.min(volumeRef.current, startAmbientVol + (1 - startAmbientVol) * progress);
        } else {
          // Crossfade to original version
          original.volume = Math.min(volumeRef.current, startOriginalVol + (1 - startOriginalVol) * progress);
          ambient.volume = Math.max(0, startAmbientVol * (1 - progress));
        }

        if (progress >= 1) {
          clearInterval(intervalId);
          // set volumes to exact values
          original.volume = !transitionToOriginal ? 0 : volumeRef.current;
          ambient.volume = !transitionToOriginal ? volumeRef.current : 0;

          if (transitionToOriginal) {
            ambient.pause();
          } else {
            original.pause();
          }

          if (intervalRef.current === intervalId) {
            intervalRef.current = null;
          }

          setIsToggling(false);
        }
      }, interval);

      intervalRef.current = intervalId;
    });
  }, [isDynamicSupported, isSeeking, isToggling]);

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
