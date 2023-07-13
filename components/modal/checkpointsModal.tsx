import TileType, { TileTypeDefaultVisited } from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GameContext } from '@root/contexts/gameContext';
import getPngDataClient from '@root/helpers/getPngDataClient';
import isPro from '@root/helpers/isPro';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import { GameState } from '../level/game';
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
  checkpoint: GameState | null;
  closeModal: () => void;
  slot: number;
}

function CheckpointModalItem({ checkpoint, closeModal, slot }: CheckpointModalItemProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const { deleteCheckpoint, loadCheckpoint, saveCheckpoint } = useContext(GameContext);

  useEffect(() => {
    if (!checkpoint) {
      setBackgroundImage(undefined);

      return;
    }

    const data = checkpoint.board.map(row => row.map(s => {
      // show darker green for visited squares
      if (s.levelDataType === TileType.Default && s.text.length > 0) {
        return TileTypeDefaultVisited;
      } else {
        return s.levelDataType;
      }
    }));

    // hide player if the level is finished
    if (data[checkpoint.pos.y][checkpoint.pos.x] !== TileType.End) {
      data[checkpoint.pos.y][checkpoint.pos.x] = TileType.Start;
    }

    for (const block of checkpoint.blocks) {
      if (block.inHole) {
        continue;
      }

      data[block.pos.y][block.pos.x] = block.type;
    }

    const joinedData = data.map(row => row.join('')).join('\n');

    setBackgroundImage(getPngDataClient(joinedData));
  }, [checkpoint]);

  return (
    <div className='flex flex-col gap-2 w-80 max-w-full items-center'>
      <div>
        <span className='font-medium'>{slot === BEST_CHECKPOINT_INDEX ? 'Your Best' : `Slot ${slot}`}</span>
        {checkpoint &&
          <span className='text-sm italic'>
            {` - ${checkpoint.moveCount} step${checkpoint.moveCount === 1 ? '' : 's'}`}
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
              loadCheckpoint(slot);
              closeModal();
            }}
            shortcut={slot === BEST_CHECKPOINT_INDEX ? 'B' : String(slot)}
            text='Load'
          />
        }
        {slot !== BEST_CHECKPOINT_INDEX &&
          <CheckpointButton
            onClick={() => saveCheckpoint(slot)}
            shortcut={`SHIFT ${String(slot)}`}
            text='Save'
          />
        }
        {slot !== BEST_CHECKPOINT_INDEX && checkpoint &&
          <CheckpointButton
            onClick={() => deleteCheckpoint(slot)}
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
        slot={BEST_CHECKPOINT_INDEX}
      />
      {checkpoints?.filter((_, i) => i < BEST_CHECKPOINT_INDEX).map((checkpoint, i) => (
        <CheckpointModalItem
          checkpoint={checkpoint}
          closeModal={closeModal}
          key={'checkpoint-' + i}
          slot={i}
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
            By upgrading to <Link href='/settings/proaccount' className='text-blue-500 hover:text-blue-300 outline-none'>Pathology Pro</Link>, you will gain access to this game-changing feature, along with additional benefits designed to enhance your gameplay:
          </div>
          <Link href='/settings/proaccount' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 m-2 rounded focus:outline-none focus:shadow-outline cursor-pointer'>
            Upgrade to Pro
          </Link>
        </div>
      }
    </Modal>
  );
}
