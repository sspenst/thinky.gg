import Direction from '@root/constants/direction';
import { GameType } from '@root/constants/Games';
import TileType, { TileTypeDefaultVisited } from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GameContext } from '@root/contexts/gameContext';
import { directionsToGameState } from '@root/helpers/checkpointHelpers';
import getPngDataClient from '@root/helpers/getPngDataClient';
import isPro from '@root/helpers/isPro';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import { BEST_CHECKPOINT_INDEX } from '@root/hooks/useCheckpoints';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
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
  const { deleteCheckpoint, level, loadCheckpoint, saveCheckpoint } = useContext(GameContext);
  const { game } = useContext(AppContext);

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
        if (game.type === GameType.COMPLETE_AND_SHORTEST && tileState.tileType === TileType.Exit) {
          return TileTypeHelper.getExitSibilingTileType(tileState.block.tileType) ?? tileState.block.tileType;
        }

        return tileState.block.tileType;
      }

      // show darker green for visited tiles
      if (tileState.tileType === TileType.Default && tileState.text.length > 0 && game.showVisitedTiles) {
        return TileTypeDefaultVisited;
      }

      return tileState.tileType;
    }));

    // hide player if the level is finished
    if (data[gameState.pos.y][gameState.pos.x] !== TileType.Exit) {
      data[gameState.pos.y][gameState.pos.x] = TileType.Player;
    }

    const joinedData = data.map(row => row.join('')).join('\n');

    setBackgroundImage(getPngDataClient(game, joinedData));
  }, [checkpoint, game, level.data]);

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
        className='background rounded-md bg-cover bg-center w-full bg-1 border-color-2 border'
        style={{
          aspectRatio: '40 / 21',
          backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
        }}
      />
      <div className='flex gap-4'>
        {checkpoint &&
          <CheckpointButton
            onClick={() => {
              loadCheckpoint(index);
              closeModal();
            }}
            shortcut={index === BEST_CHECKPOINT_INDEX ? 'B' : String(index)}
            text='Load'
          />
        }
        {index !== BEST_CHECKPOINT_INDEX &&
          <CheckpointButton
            onClick={() => saveCheckpoint(index)}
            shortcut={`SHIFT ${String(index)}`}
            text='Save'
          />
        }
        {index !== BEST_CHECKPOINT_INDEX && checkpoint &&
          <CheckpointButton
            onClick={() => deleteCheckpoint(index)}
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
  const { game, user } = useContext(AppContext);

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
            With checkpoints, you can <span className='font-bold italic'>save the state</span> of the board to {game.displayName} servers at any moment, making it easy to jump back and retry from a specific point.
          </div>
          <div>
            By upgrading to <Link href='/settings/pro' className='text-blue-500 hover:text-blue-300 outline-none'>{game.displayName} Pro</Link>, you will gain access to this game-changing feature, along with additional benefits designed to enhance your gameplay:
          </div>
          <Link href='/settings/pro' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 m-2 rounded focus:outline-none focus:shadow-outline cursor-pointer'>
            Upgrade to Pro
          </Link>
        </div>
      }
    </Modal>
  );
}
