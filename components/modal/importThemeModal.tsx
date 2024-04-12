import React, { useState } from 'react';
import Modal from '.';

interface ImportThemeModalProps {
  closeModal: () => void;
  isOpen: boolean;
  onSubmit: (data: string) => void;
}

export default function ImportThemeModal({ closeModal, isOpen, onSubmit }: ImportThemeModalProps) {
  const [data, setData] = useState('');

  function onDataChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setData(e.currentTarget.value);
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      onSubmit={() => {
        onSubmit(data);
        closeModal();
      }}
      title='Import Theme'
    >
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <textarea
          className='p-1 rounded-md border text-xs font-mono'
          name='data'
          onChange={onDataChange}
          placeholder='Paste exported theme here'
          required
          rows={6}
          value={data}
        />
      </div>
    </Modal>
  );
}
