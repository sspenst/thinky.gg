import React, { createContext, useContext } from 'react';

export interface AudioPlayerState {
  randomNumber?: number;
  currentSongIndex: number;
  isPlaying: boolean;
  isHot: boolean;
  audioContext?: AudioContext;
  audioActive?: HTMLAudioElement;
  audioAmbient?: HTMLAudioElement;
  currentTitle?: string;
  toggleVersion?: (command: 'hot'|'cool'|'switch') => void;

}

export const AudioPlayerContext = createContext<[AudioPlayerState, React.Dispatch<React.SetStateAction<AudioPlayerState>>]>((null as unknown) as [AudioPlayerState, React.Dispatch<React.SetStateAction<AudioPlayerState>>]);

export const useAudioPlayerState = () => {
  return useContext(AudioPlayerContext);
};
