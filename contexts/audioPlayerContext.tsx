import { SongMetaData } from '@root/components/audioPlayer/audioPlayer';
import React, { createContext, useEffect, useState } from 'react';

export interface AudioPlayerState {
  audioActive?: HTMLAudioElement;
  audioAmbient?: HTMLAudioElement;
  audioContext?: AudioContext;
  currentSongIndex: number;
  currentMetaData: SongMetaData;
  dynamicMusic: boolean;
  isHot: boolean;
  isPlaying: boolean;
  maxVolume: number;
  setAudioActive: (audioActive: HTMLAudioElement) => void;
  setAudioAmbient: (audioAmbient: HTMLAudioElement) => void;
  setAudioContext: (audioContext: AudioContext) => void;
  setCurrentSongIndex: (index: number) => void;
  setCurrentMetaData: (metaData: SongMetaData) => void;
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
  currentMetaData: { title: '', artist: '', active: '', ambient: '', website: '' },
  dynamicMusic: false,
  isHot: false,
  isPlaying: false,
  maxVolume: 0,
  setAudioActive: (audioActive: HTMLAudioElement) => {},
  setAudioAmbient: (audioAmbient: HTMLAudioElement) => {},
  setAudioContext: (audioContext: AudioContext) => {},
  setCurrentSongIndex: (index: number) => {},
  setCurrentMetaData: (metaData: SongMetaData) => {},
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
  const [currentMetaData, setCurrentMetaData] = useState<SongMetaData>({ title: '', artist: '', active: '', ambient: '', website: '' });
  const [dynamicMusic, setDynamicMusic] = useState(true);
  const [isHot, setIsHot] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxVolume, setMaxVolume] = useState(1);

  useEffect(() => {
    // load from local storage the currentSongIndex, isHot, dynamicMusic, maxVolume and load it into state
    const LS_currentSongIndex = localStorage.getItem('audio.currentSongIndex');
    const LS_isHot = localStorage.getItem('audio.isHot');
    const LS_dynamicMusic = localStorage.getItem('audio.dynamicMusic');
    const LS_maxVolume = localStorage.getItem('audio.maxVolume');

    LS_currentSongIndex && setCurrentSongIndex(parseInt(LS_currentSongIndex));
    LS_isHot && setIsHot(LS_isHot === 'true');
    LS_dynamicMusic && setDynamicMusic(LS_dynamicMusic === 'true');
    LS_maxVolume && setMaxVolume(parseFloat(LS_maxVolume));
  }, []);

  // now a use effect to save the currentSongIndex, isHot, dynamicMusic, maxVolume to local storage
  useEffect(() => {
    localStorage.setItem('audio.currentSongIndex', currentSongIndex.toString());
    localStorage.setItem('audio.isHot', isHot.toString());
    localStorage.setItem('audio.dynamicMusic', dynamicMusic.toString());
    localStorage.setItem('audio.maxVolume', maxVolume.toString());
  }, [currentSongIndex, isHot, dynamicMusic, maxVolume]);

  return (
    <AudioPlayerContext.Provider value={{
      audioActive: audioActive,
      audioAmbient: audioAmbient,
      audioContext: audioContext,
      currentSongIndex: currentSongIndex,
      currentMetaData: currentMetaData,
      dynamicMusic: dynamicMusic,
      isHot: isHot,
      isPlaying: isPlaying,
      maxVolume: maxVolume,
      setCurrentSongIndex: setCurrentSongIndex,
      setCurrentMetaData: setCurrentMetaData,
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
