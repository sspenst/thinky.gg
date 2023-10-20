import Direction from '@root/constants/direction';
import TileType, { TileTypeDefaultVisited } from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GameContext } from '@root/contexts/gameContext';
import { directionsToGameState } from '@root/helpers/checkpointHelpers';
import getPngDataClient from '@root/helpers/getPngDataClient';
import isPro from '@root/helpers/isPro';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '.';

interface CheckpointButtonProps {
  onClick: () => void;
  shortcut?: string;
  text: string;
}

function CheckpointButton({ onClick, shortcut, text }: CheckpointButtonProps) {
  return (
    <button
      className='border rounded-md px-2 pb-1 tab transition flex flex-col items-center justify-center gap-0.5'
      onClick={onClick}
      style={{
        borderColor: 'var(--bg-color-3)',
      }}
    >
      <span>{text}</span>
      {shortcut && <span className='font-mono text-xs'>{shortcut}</span>}
    </button>
  );
}

interface CheckpointModalItemProps {
  checkpoint: Direction[] | null;
  closeModal: () => void;
  index: number;
}

function CheckpointModalItem({ checkpoint, closeModal, index }: CheckpointModalItemProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const { level, mutateCheckpoints } = useContext(GameContext);

  useEffect(() => {
    if (!checkpoint) {
      setBackgroundImage(undefined);

      return;
    }

    const gameState = directionsToGameState(checkpoint, level.data);

    if (!gameState) {
      setBackgroundImage(undefined);

      return;
    }

    const data = gameState.board.map(row => row.map(tileState => {
      if (tileState.block) {
        return tileState.block.tileType;
      }

      // show darker green for visited tiles
      if (tileState.tileType === TileType.Default && tileState.text.length > 0) {
        return TileTypeDefaultVisited;
      }

      return tileState.tileType;
    }));

    // hide player if the level is finished
    if (data[gameState.pos.y][gameState.pos.x] !== TileType.End) {
      data[gameState.pos.y][gameState.pos.x] = TileType.Start;
    }

    const joinedData = data.map(row => row.join('')).join('\n');

    setBackgroundImage(getPngDataClient(joinedData));
  }, [checkpoint, level.data]);

  function getKeyCodeFromIndex(index: number) {
    if (index < 0 || index > BEST_CHECKPOINT_INDEX) {
      return '';
    }

    if (index === BEST_CHECKPOINT_INDEX) {
      return 'KeyB';
    } else {
      return `Digit${index}`;
    }
  }

  return (
    <div className='flex flex-col gap-2 w-80 max-w-full items-center'>
      <div>
        <span className='font-medium'>{index === BEST_CHECKPOINT_INDEX ? 'Your Best' : `Slot ${index}`}</span>
        {checkpoint &&
          <span className='text-sm italic'>
            {` - ${checkpoint.length} step${checkpoint.length === 1 ? '' : 's'}`}
          </span>
        }
      </div>
      <div
        className='background rounded-md bg-cover bg-center w-full'
        style={{
          backgroundColor: 'var(--bg-color)',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
          aspectRatio: '40 / 21',
        }}
      />
      <div className='flex gap-4'>
        {checkpoint &&
          <CheckpointButton
            onClick={() => {
              // TODO: this doesn't work because of preventKeyDownEvent
              document.dispatchEvent(new KeyboardEvent('keydown', { 'code': getKeyCodeFromIndex(index) }));
              closeModal();
            }}
            shortcut={index === BEST_CHECKPOINT_INDEX ? 'B' : String(index)}
            text='Load'
          />
        }
        {index !== BEST_CHECKPOINT_INDEX &&
          <CheckpointButton
            onClick={() => {
              // TODO: this doesn't work because of preventKeyDownEvent
              document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'ShiftLeft' }));
              document.dispatchEvent(new KeyboardEvent('keydown', { 'code': getKeyCodeFromIndex(index) }));
              document.dispatchEvent(new KeyboardEvent('keyup', { 'code': 'ShiftLeft' }));
            }}
            shortcut={`SHIFT ${String(index)}`}
            text='Save'
          />
        }
        {index !== BEST_CHECKPOINT_INDEX && checkpoint &&
          <CheckpointButton
            onClick={() => {
              if (index !== BEST_CHECKPOINT_INDEX) {
                toast.dismiss();
                toast.loading(`Deleting checkpoint ${index}...`);
              }

              fetch(`/api/level/${level._id}/checkpoints?index=${index}`, {
                method: 'DELETE',
              }).then(async res => {
                if (res.status === 200) {
                  if (index !== BEST_CHECKPOINT_INDEX) {
                    toast.dismiss();
                    toast.success(`Deleted checkpoint ${index}`);
                  }

                  mutateCheckpoints();
                } else {
                  throw res.text();
                }
              }).catch(async err => {
                console.error(err);
                toast.dismiss();
                toast.error(JSON.parse(await err)?.error || 'Error deleting checkpoint');
              });
            }}
            text='Delete'
          />
        }
      </div>
    </div>
  );
}

interface ProCheckpointsModalProps {
  closeModal: () => void;
}

function ProCheckpointsModal({ closeModal }: ProCheckpointsModalProps) {
  const { checkpoints } = useContext(GameContext);

  if (!checkpoints) {
    return null;
  }

  return (
    <div className='flex flex-wrap justify-center gap-6 max-w-full'>
      <CheckpointModalItem
        checkpoint={checkpoints[BEST_CHECKPOINT_INDEX]}
        closeModal={closeModal}
        key={'checkpoint-best'}
        index={BEST_CHECKPOINT_INDEX}
      />
      {checkpoints?.filter((_, i) => i < BEST_CHECKPOINT_INDEX).map((checkpoint, i) => (
        <CheckpointModalItem
          checkpoint={checkpoint}
          closeModal={closeModal}
          key={'checkpoint-' + i}
          index={i}
        />
      ))}
    </div>
  );
}

interface CheckpointsModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function CheckpointsModal({ closeModal, isOpen }: CheckpointsModalProps) {
  const { user } = useContext(AppContext);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Checkpoints'}
    >
      {isPro(user) ?
        <ProCheckpointsModal closeModal={closeModal} />
        :
        <div className='flex flex-col gap-4 items-center'>
          <div>
            With checkpoints, you can <span className='font-bold italic'>save the state</span> of the board to Pathology servers at any moment, making it easy to jump back and retry from a specific point.
          </div>
          <div>
            By upgrading to <Link href='/settings/pro' className='text-blue-500 hover:text-blue-300 outline-none'>Pathology Pro</Link>, you will gain access to this game-changing feature, along with additional benefits designed to enhance your gameplay:
          </div>
          <Link href='/settings/pro' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 m-2 rounded focus:outline-none focus:shadow-outline cursor-pointer'>
            Upgrade to Pro
          </Link>
        </div>
      }
    </Modal>
  );
}
