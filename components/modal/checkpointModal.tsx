import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import React, { useContext } from 'react';
import { GameState } from '../level/game';
import Modal from '.';

interface CheckpointModalProps {
  checkpoints?: (GameState | null)[];
  closeModal: () => void;
  isOpen: boolean;
}

export default function CheckpointModal({ checkpoints, closeModal, isOpen }: CheckpointModalProps) {
  const { user } = useContext(AppContext);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Checkpoints'}
    >
      {isPro(user) ?
        <div className='flex flex-col items-center gap-2'>
          <span>
            Press SHIFT + [0-9] to save a checkpoint.<br />Press the number to go back to that state.
          </span>
          <div className='flex flex-col gap-1 w-fit justify-center cursor-default'>
            <div className='flex flex-row gap-2'>
              <span className='font-bold w-10 text-center'>Key</span>
              <span className='font-bold w-12 text-center'>Steps</span>
            </div>
            {checkpoints?.map((checkpoint, i) => (
              <div className='flex flex-row gap-2 py-1 rounded-md tab transition' key={'checkpoint-' + i}>
                <span className='w-10 text-center'>{i}</span>
                <span className='w-12 text-center'>{checkpoint?.moves.length ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
        :
        <div>
          Get <Link href='/settings/proaccount' className='text-blue-300 outline-none'>
            Pathology Pro
          </Link> to unlock checkpoints.
        </div>
      }
    </Modal>
  );
}
