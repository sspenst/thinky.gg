import React, { createContext, useContext, useState } from 'react';

export interface AudioPlayerState {
  audioActive?: HTMLAudioElement;
  audioAmbient?: HTMLAudioElement;
  audioContext?: AudioContext;
  currentSongIndex: number;
  currentTitle: string;
  dynamicMusic: boolean;
  isHot: boolean;
  isPlaying: boolean;
  maxVolume: number;
  setAudioActive: (audioActive: HTMLAudioElement) => void;
  setAudioAmbient: (audioAmbient: HTMLAudioElement) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setCurrentSongIndex: (index: number) => void;
  setCurrentTitle: (title: string) => void;
  setDynamicMusic: (dynamicMusic: boolean) => void;
  setIsHot: (isHot: boolean) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setMaxVolume: (volume: number) => void;
  toggleVersion?: (command: 'hot'|'cool'|'switch') => void;
}

export const AudioPlayerContext = createContext<AudioPlayerState>({
  audioActive: undefined,
  audioAmbient: undefined,
  audioContext: undefined,
  currentSongIndex: 0,
  currentTitle: '',
  dynamicMusic: false,
  isHot: false,
  isPlaying: false,
  maxVolume: 0,
  setAudioActive: (audioActive: HTMLAudioElement) => {},
  setAudioAmbient: (audioAmbient: HTMLAudioElement) => {},
  setAudioContext: (audioContext: AudioContext) => {},
  setCurrentSongIndex: (index: number) => {},
  setCurrentTitle: (title: string) => {},
  setDynamicMusic: (dynamicMusic: boolean) => {},
  setIsHot: (isHot: boolean) => {},
  setIsPlaying: (isPlaying: boolean) => {},
  setMaxVolume: (volume: number) => {},
});

export function AudioPlayerContextProvider({ children }: { children: React.ReactNode }) {
  const [audioActive, setAudioActive] = useState<HTMLAudioElement>();
  const [audioAmbient, setAudioAmbient] = useState<HTMLAudioElement>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTitle, setCurrentTitle] = useState<string>();
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxVolume, setMaxVolume] = useState(1);

  return (
    <AudioPlayerContext.Provider value={{
      audioActive: audioActive,
      audioAmbient: audioAmbient,
      audioContext: audioContext,
      currentSongIndex: currentSongIndex,
      currentTitle: currentTitle || '',
      dynamicMusic: dynamicMusic,
      isHot: isHot,
      isPlaying: isPlaying,
      maxVolume: maxVolume,
      setCurrentSongIndex: setCurrentSongIndex,
      setCurrentTitle: setCurrentTitle,
      setDynamicMusic: setDynamicMusic,
      setIsHot: setIsHot,
      setIsPlaying: setIsPlaying,
      setAudioActive: setAudioActive,
      setAudioAmbient: setAudioAmbient,
      setAudioContext: setAudioContext,
      setMaxVolume: setMaxVolume,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
