import { PageContext } from '@root/contexts/pageContext';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Control from '../../models/control';
import Level, { EnrichedLevel } from '../../models/db/level';
import FormattedUser from '../formattedUser';
import CheckpointsModal from '../modal/checkpointsModal';
import Block from './block';
import Controls from './controls';
import { GameState } from './game';
import Grid from './grid';
import Player from './player';
import Sidebar from './sidebar';

interface GameLayoutProps {
  controls: Control[];
  gameState: GameState;
  hideSidebar?: boolean;
  level: EnrichedLevel;
  matchId?: string;
  onCellClick: (x: number, y: number) => void;
}

export default function GameLayout({ controls, gameState, hideSidebar, level, matchId, onCellClick }: GameLayoutProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const [isCheckpointOpen, setIsCheckpointOpen] = React.useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [fullScreen]);

  useEffect(() => {
    setPreventKeyDownEvent(isCheckpointOpen);
  }, [isCheckpointOpen, setPreventKeyDownEvent]);

  return (
    <div className='flex flex-row h-full w-full'>
      <div className='flex grow flex-col h-full relative'>
        {!matchId && level.userId &&
          <div className='flex flex-row items-center justify-center p-2 gap-1 block xl:hidden'>
            <button className='mr-1' onClick={() => setIsCheckpointOpen(!isCheckpointOpen)}>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
              </svg>
            </button>
            <h1
              style={{
                color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)',
              }}
            >{level.name}</h1>
            by
            <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
          </div>
        }
        <Grid
          board={gameState.board}
          generateMovables={(borderWidth, squareSize) => <>
            {gameState.blocks.map(block => <Block
              block={block}
              borderWidth={borderWidth}
              key={`block-${block.id}`}
              onClick={() => onCellClick(block.pos.x, block.pos.y)}
              size={squareSize}
            />)}
            <Player
              borderWidth={borderWidth}
              gameState={gameState}
              leastMoves={level.leastMoves}
              size={squareSize}
            />
          </>}
          leastMoves={level.leastMoves}
          onCellClick={(x, y, rightClick) => {
            if (!rightClick) {
              onCellClick(x, y);
            }
          }}
        />
        <Controls controls={controls} />
        {!hideSidebar &&
          <div className='gap-4 absolute bottom-0 right-0 m-3 z-10 transition-opacity hidden xl:flex'>
            <button onClick={() => setIsCheckpointOpen(!isCheckpointOpen)}>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
              </svg>
            </button>
            <CheckpointsModal
              closeModal={() => setIsCheckpointOpen(false)}
              isOpen={isCheckpointOpen}
            />
            <button onClick={() => setFullScreen(f => !f)}>
              {fullScreen ?
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25' />
                </svg>
                :
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15' />
                </svg>
              }
            </button>
          </div>
        }
      </div>
      {!hideSidebar && !fullScreen && <Sidebar level={level} />}
    </div>
  );
}
