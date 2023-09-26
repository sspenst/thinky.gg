import React from 'react';
import AudioPlayer from '../audioPlayer/audioPlayer';
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
  return (
    <Modal title='Audio Settings' isOpen={isOpen} closeModal={closeModal}>
      <div className='flex flex-col gap-2'>

        <div className='flex flex-row gap-2'>
          <div className='flex flex-row gap-2'>
            <div>Dynamic Music</div>
            <div>
              <input type='checkbox' />
            </div>
          </div>
          <div className='flex flex-col word-wrap gap-2 text-sm'>
            <span>Changes the music depending on what is happening in the game.</span>
            <span className='text-xs'>For example, if you are in a puzzle, the music will be more ambient.<br />After solving, the music will transition to a more energetic track.</span>
          </div>
        </div>

        <div className='flex flex-row gap-2'>
          <div>Music Volume</div>
          <div>
            <input type='range' />
          </div>
        </div>
        <div className='flex flex-row items-center justify-center'>
          <AudioPlayer hideSettingsButton={true} />
        </div>
      </div>
    </Modal>
  );
}
