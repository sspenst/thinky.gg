import { useRouter } from 'next/router';
import { useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  function onSubmit() {
    setIsSubmitting(true);
    toast.dismiss();
    toast.loading('Updating level...');

    fetch(`/api/level/${level._id}/trim`, {
      method: 'PUT',
      credentials: 'include',
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
      Trimming this published level will be irreversible.
    </Modal>
  );
}
