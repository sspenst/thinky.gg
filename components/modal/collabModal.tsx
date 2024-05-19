import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Level from '../../models/db/level';
import MultiSelectUser from '../page/multiSelectUser';
import Modal from '.';

interface CollabModalProps {
  closeModal: () => void;
  historyPush: (level: Level) => void;
  isOpen: boolean;
  level: Level;
  setIsDirty: () => void;
  setLevel: (value: React.SetStateAction<Level>) => void;
}

export default function CollabModal({ closeModal, isOpen, level }: CollabModalProps) {
  const [authorNote, setAuthorNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setAuthorNote(level.authorNote ?? '');
    setName(level.name);
  }, [level]);

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title='Edit Level'
    >
      <div className='flex flex-col gap-2 w-112 max-w-full'>
        <label className='font-semibold' htmlFor='name'>Invite collaborators:</label>
        <div className='flex flex-row gap-2'><MultiSelectUser />
          <button className='btn btn-primary bg-blue-500 rounded-md text-sm text-white px-2 py-1 font-semibold hover:bg-blue-600'
            onClick={onSubmit} type='button'>Invite</button>
        </div>
        <label className='font-semibold' htmlFor='name'>Invite testers:</label>
        <div className='flex flex-row gap-2'><MultiSelectUser />
          <button className='btn btn-primary bg-blue-500 rounded-md text-sm text-white px-2 py-1 font-semibold hover:bg-blue-600'
            onClick={onSubmit} type='button'>Invite</button>
        </div>
      </div>
    </Modal>
  );
}
