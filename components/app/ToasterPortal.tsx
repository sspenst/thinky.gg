import { Portal } from '@headlessui/react';
import OpenReplay from '@root/components/openReplay';
import { Confetti } from '@root/components/page/confetti';
import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToasterPortal() {
  return (
    <Portal>
      <Toaster toastOptions={{ duration: 1500 }} />
      <Confetti />
      <OpenReplay />
    </Portal>
  );
}
