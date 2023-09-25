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
      <div>
        <h1>Audio Settings</h1>
        <AudioPlayer key='audio-settings-modal' hideSettingsButton={true} />
      </div>
    </Modal>
  );
}
