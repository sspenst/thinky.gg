import React, { createContext, useContext, useState } from 'react';

export interface AudioPlayerState {
  setCurrentSongIndex: (index: number) => void;
  currentSongIndex: number;

  setIsPlaying: (isPlaying: boolean) => void;
  isPlaying: boolean;

  isHot: boolean;
  setIsHot: (isHot: boolean) => void;

  setAudioContext: (audioContext: AudioContext) => void;
  audioContext?: AudioContext;

  setAudioActive: (audioActive: HTMLAudioElement) => void;
  audioActive?: HTMLAudioElement;

  setAudioAmbient: (audioAmbient: HTMLAudioElement) => void;
  audioAmbient?: HTMLAudioElement;

  setCurrentTitle: (title: string) => void;
  currentTitle: string;

  toggleVersion?: (command: 'hot'|'cool'|'switch') => void;

}

export const AudioPlayerContext = createContext<AudioPlayerState>({

  currentSongIndex: 0,
  isPlaying: false,
  isHot: false,
  currentTitle: '',
  setCurrentTitle: (title: string) => {},
  setCurrentSongIndex: (index: number) => {},
  setIsPlaying: (isPlaying: boolean) => {},
  setIsHot: (isHot: boolean) => {},
  setAudioContext: (audioContext: AudioContext) => {},
  setAudioActive: (audioActive: HTMLAudioElement) => {},
  setAudioAmbient: (audioAmbient: HTMLAudioElement) => {},

});

export function AudioPlayerContextProvider({ children }: {children: React.ReactNode}) {
  // audio
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHot, setIsHot] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [audioActive, setAudioActive] = useState<HTMLAudioElement>();
  const [audioAmbient, setAudioAmbient] = useState<HTMLAudioElement>();

  return <AudioPlayerContext.Provider value={{
    currentSongIndex: currentSongIndex,
    isPlaying: isPlaying,
    isHot: isHot,
    currentTitle: currentTitle || '',
    audioContext: audioContext,
    audioActive: audioActive,
    audioAmbient: audioAmbient,
    setCurrentSongIndex: setCurrentSongIndex,
    setIsPlaying: setIsPlaying,
    setIsHot: setIsHot,
    setAudioContext: setAudioContext,
    setCurrentTitle: setCurrentTitle,
    setAudioActive: setAudioActive,
    setAudioAmbient: setAudioAmbient,

  }}>
    {children}
  </AudioPlayerContext.Provider>;
}
