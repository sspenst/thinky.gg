import React, { useState } from 'react';
import AudioSettingsModal from '../modal/audioSettingsModal';
import AudioPlayer from './audioPlayer';

export function AudioPlayerHeader() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <AudioPlayer onSettingsClick={() => {
        setModalOpen(true);
      }} />
      <AudioSettingsModal isOpen={modalOpen} closeModal={() => {
        setModalOpen(false);
      }} />
    </>
  );
}
