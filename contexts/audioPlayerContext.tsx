import React, { createContext, useContext } from 'react';

export interface AudioPlayerState {
  currentSongIndex: number;
  isPlaying: boolean;
  isHot: boolean;
  audioContext?: AudioContext;
  audioActive?: HTMLAudioElement;
  audioAmbient?: HTMLAudioElement;
  currentTitle?: string;
  toggleVersion?: (command: 'hot'|'cool'|'switch') => void;
  // Add any other state variables you want to preserve
}

export const AudioPlayerContext = createContext<[AudioPlayerState, React.Dispatch<React.SetStateAction<AudioPlayerState>>]>((null as unknown) as [AudioPlayerState, React.Dispatch<React.SetStateAction<AudioPlayerState>>]);

export const useAudioPlayerState = () => {
  return useContext(AudioPlayerContext);
};
