import { AudioPlayerContext } from '@root/contexts/audioPlayerContext';
import Link from 'next/link';
import React, { useContext } from 'react';
import AudioPlayer from '../header/audioPlayer';
import Modal from '.';

interface AudioSettingsModal {
    closeModal: () => void;
    isOpen: boolean;
  }

// Define component props
interface AudioSettingsModalProps {
    closeModal: () => void;
    isOpen: boolean;
}

// Define component
export default function AudioSettingsModal({ closeModal, isOpen }: AudioSettingsModalProps) {
  const { audioContext, audioActive, audioAmbient, currentMetaData, isHot, dynamicMusic, setDynamicMusic, maxVolume, setMaxVolume } = useContext(AudioPlayerContext);

  return (
    <Modal title='Audio Settings' isOpen={isOpen} closeModal={closeModal}>
      <div className='flex flex-col gap-2'>
        <div className='flex flex-row gap-2'>
          <div className='flex flex-row gap-2'>
            <div>Dynamic Music</div>
            <div>
              <input type='checkbox' checked={dynamicMusic} onChange={() => setDynamicMusic(!dynamicMusic)} />
            </div>
          </div>
          <div className='flex flex-col word-wrap gap-2 text-sm'>
            <span>Changes the music depending on what is happening in the game.</span>
            <span className='text-xs'>For example, if you are in a puzzle, the music will be more ambient ❄️.<br />After solving, the music will transition to a more energetic 🔥 version.</span>
          </div>
        </div>
        <div className='flex flex-row gap-2'>
          <div>Music Volume</div>
          <div>
            <input type='range' min='0' max='1' step='0.01' value={maxVolume} onChange={(e) => {
              if (audioContext && audioActive && audioAmbient) {
                if (isHot) {
                  audioActive.volume = maxVolume;
                  audioAmbient.volume = 0;
                } else {
                  audioAmbient.volume = maxVolume;
                  audioActive.volume = 0;
                }

                setMaxVolume(parseFloat(e.target.value));
              }
            }
            } />
          </div>
        </div>
        <div className='flex flex-col gap-2 items-center justify-center'>
          <AudioPlayer hideSettingsButton={true} />
          <span>Artist:&nbsp;
            <Link className='underline font-bold'
              href={currentMetaData.website}>{currentMetaData.artist}
            </Link>
          </span>
          <span className='text-xs'>Currently playing {isHot ? 'energetic 🔥' : 'ambient ❄️'} version.</span>
        </div>
      </div>
    </Modal>
  );
}
