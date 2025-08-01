import Image from 'next/image';
import { useRouter } from 'next/router';
import { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '.';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import FormattedAuthorNote from '../formatted/formattedAuthorNote';
import isNotFullAccountToast from '../toasts/isNotFullAccountToast';
import SchedulePublishModal from './schedulePublishModal';

interface PublishLevelModalProps {
  closeModal: () => void;
  isOpen: boolean;
  level: Level;
}

export default function PublishLevelModal({ closeModal, isOpen, level }: PublishLevelModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const { mutateUser, user } = useContext(AppContext);
  const router = useRouter();

  function onConfirm() {
    setIsPublishing(true);
    toast.dismiss();
    toast.loading('Publishing level...');

    fetch(`/api/publish/${level._id}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async res => {
      if (res.status === 401) {
        isNotFullAccountToast('Publishing a level');
      } else if (res.status === 200) {
        closeModal();
        mutateUser();

        toast.dismiss();
        toast.success('Published');

        const level = await res.json();

        router.push(`/level/${level.slug}`);
      } else {
        const resp = await res.json();

        toast.dismiss();
        toast.error(resp.error);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error publishing level');
    }).finally(() => {
      setIsPublishing(false);
    });
  }

  function onSchedule() {
    // Open the schedule modal for Pro users
    setIsScheduleModalOpen(true);
  }

  return (
    <>
      <Modal
        closeModal={closeModal}
        isOpen={isOpen}
        title={'Publish Level'}
      >
        <div className='break-words space-y-4'>
          <div>
            <span className='font-bold'>Name:</span> {level.name}
            <br />
            <span className='font-bold'>Moves:</span> {level.leastMoves}
            {!level.authorNote ? null :
              <div className='mt-4'>
                <span className='font-bold'>Author Note:</span>
                <br />
                <FormattedAuthorNote authorNote={level.authorNote} />
              </div>
            }
          </div>
          {/* Custom Button Row */}
          <div className='flex justify-center gap-3 pt-4'>
            <button
              onClick={onConfirm}
              disabled={isPublishing}
              className='inline-flex justify-center px-6 py-2 text-sm font-medium border border-transparent rounded-md bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white'
            >
              {isPublishing ? 'Publishing...' : 'Publish Now'}
            </button>
            
            <button
              onClick={onSchedule}
              disabled={isPublishing}
              className='inline-flex items-center justify-center gap-2 px-6 py-2 text-sm font-medium border border-transparent rounded-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white'
            >
              <Image alt='pro' src='/pro.svg' width={16} height={16} className='opacity-90' />
              Schedule
            </button>
          </div>
        </div>
      </Modal>
      <SchedulePublishModal
        closeModal={() => setIsScheduleModalOpen(false)}
        isOpen={isScheduleModalOpen}
        level={level}
      />
    </>
  );
}
