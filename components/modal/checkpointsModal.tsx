import LevelUtil from '@root/constants/levelDataType';
import { AppContext } from '@root/contexts/appContext';
import { GameContext } from '@root/contexts/gameContext';
import getPngDataClient from '@root/helpers/getPngDataClient';
import isPro from '@root/helpers/isPro';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import { GameState } from '../level/game';
import Modal from '.';

interface CheckpointImageProps {
  checkpoint: GameState | null;
  closeModal: () => void;
  slot: number;
}

function CheckpointImage({ checkpoint, closeModal, slot }: CheckpointImageProps) {
  const [backgroundImage, setBackgroundImage] = useState<string>();
  const { loadCheckpoint, saveCheckpoint } = useContext(GameContext);

  useEffect(() => {
    if (!checkpoint) {
      return;
    }

    const data = checkpoint.board.map(row => row.map(s => {
      // show darker green for visited squares
      if (s.levelDataType === LevelUtil.Default && s.text.length > 0) {
        return LevelUtil.DefaultVisited;
      } else {
        return s.levelDataType;
      }
    }));

    // hide player if the level is finished
    if (data[checkpoint.pos.y][checkpoint.pos.x] !== LevelUtil.End) {
      data[checkpoint.pos.y][checkpoint.pos.x] = LevelUtil.Start;
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
    <button
      className='flex flex-col items-center gap-1 rounded-md tab transition px-2 py-1'
      onClick={() => {
        if (!checkpoint) {
          saveCheckpoint(slot);
        } else {
          loadCheckpoint(slot);
          closeModal();
        }
      }}
    >
      <span className='font-medium'>{`Slot ${slot}`}</span>
      {checkpoint ?
        <>
          <div
            className='background rounded-md bg-cover bg-center w-full'
            style={{
              backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
              aspectRatio: '40 / 21'
            }}
          />
          <span className='text-sm italic'>
            {`${checkpoint.moveCount} step${checkpoint.moveCount === 1 ? '' : 's'}`}
          </span>
        </>
        :
        <span>
          -
        </span>
      }
    </button>
  );
}

interface CheckpointsModalProps {
  closeModal: () => void;
  isOpen: boolean;
}

export default function CheckpointsModal({ closeModal, isOpen }: CheckpointsModalProps) {
  const { checkpoints } = useContext(GameContext);
  const { user } = useContext(AppContext);

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={'Checkpoints'}
    >
      {isPro(user) ?
        <div className='flex flex-col gap-4 max-w-full'>
          <span className='text-center'>
            Keyboard shortcuts for slots 0-9:<br />
            Save: Shift + 0-9<br />
            Load: 0-9
          </span>
          <div className='flex flex-col gap-1 w-80 max-w-full justify-center'>
            {checkpoints?.map((checkpoint, i) => (
              <CheckpointImage
                checkpoint={checkpoint}
                closeModal={closeModal}
                key={'checkpoint-' + i}
                slot={i}
              />
            ))}
          </div>
        </div>
        :
        <div className='p-6 rounded-md shadow-md'>
          <div className='mb-3'>With Checkpoints, you can <span className='font-bold italic'>save the state</span> of the board to Pathology servers at any moment using hotkeys 0-9, making it easy to jump back and retry from a specific point.</div>
          <div className='mb-3'>By upgrading to <Link href='/settings/proaccount' className='text-blue-500 hover:text-blue-600 outline-none'>Pathology Pro</Link>, you will gain access to this game-changing feature, along with additional benefits designed to enhance your gameplay:</div>
          <div className='text-blue-500 hover:text-blue-600 cursor-pointer transition-colors duration-150 text-center'>
            <div>
              <Link href='/settings/proaccount' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'>
                <span className=''>Upgrade to Pro</span>
              </Link>
            </div>
          </div>
        </div>

      }
    </Modal>
  );
}
