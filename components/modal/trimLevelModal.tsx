import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Level from '../../models/db/level';
import Modal from '.';

interface TrimLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
  onLevelUpdated?: (updatedLevel: Level) => void;
}

export default function TrimLevelModal({ closeModal, isOpen, level, onLevelUpdated }: TrimLevelModalProps) {
  const [toTrim, setToTrim] = useState(true);
  const [toSimplify, setToSimplify] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  function onSubmit() {
    // No change so don't bother server
    if (!toTrim && !toSimplify) {
      toast.dismiss();
      closeModal();
      return;
    }

    setIsSubmitting(true);
    toast.dismiss();
    toast.loading('Updating level...');

    fetch(`/api/level/${level._id}/trim`, {
      method: 'PUT',
      body: JSON.stringify({
        trim: toTrim,
        simplify: toSimplify,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Updated');
        closeModal();

        const newLevel = await res.json();

        if (newLevel) {
          // Instead of reloading, update the level locally to preserve leastMoves
          if (onLevelUpdated) {
            onLevelUpdated(newLevel);
          }

          if (!newLevel.isDraft) {
            router.replace(`/level/${newLevel.slug}`);
          }
          // Don't reload for draft levels - local update is sufficient
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <Modal
      closeModal={closeModal}
      disabled={isSubmitting}
      isOpen={isOpen}
      onSubmit={onSubmit}
      title='Trim Level'
    >
      <div className='flex flex-col gap-2 max-w-full'>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='trim'>Trim?</label>
          <input
            checked={toTrim}
            id='trim'
            name='trim'
            onChange={() => setToTrim(prevToTrim => !prevToTrim)}
            type='checkbox'
          />
        </div>
        <div className='flex flex-row gap-2 items-center w-full'>
          <label className='font-semibold' htmlFor='simplify'>Simplify?</label>
          <input
            checked={toSimplify}
            id='simplify'
            name='simplify'
            onChange={() => setToSimplify(prevToSimplify => !prevToSimplify)}
            type='checkbox'
          />
        </div>
      </div>
    </Modal>
  );
}
