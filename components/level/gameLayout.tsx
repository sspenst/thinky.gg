import TileType from '@root/constants/tileType';
import { PageContext } from '@root/contexts/pageContext';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Control from '../../models/control';
import { EnrichedLevel } from '../../models/db/level';
import Complete from '../complete';
import FormattedUser from '../formattedUser';
import CheckpointsModal from '../modal/checkpointsModal';
import Controls from './controls';
import { GameState } from './game';
import Grid from './grid';
import Sidebar from './sidebar';
import Tile from './tile';

interface GameLayoutProps {
  controls: Control[];
  disableCheckpoints?: boolean;
  gameState: GameState;
  hideSidebar?: boolean;
  level: EnrichedLevel;
  matchId?: string;
  onCellClick: (x: number, y: number) => void;
}

export default function GameLayout({ controls, disableCheckpoints, gameState, hideSidebar, level, matchId, onCellClick }: GameLayoutProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const [isCheckpointOpen, setIsCheckpointOpen] = React.useState(false);
  const { setPreventKeyDownEvent, setShowHeader } = useContext(PageContext);

  useEffect(() => {
    function handleFullScreenChange() {
      setFullScreen(!!document.fullscreenElement);
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    setShowHeader(!fullScreen);
  }, [fullScreen, setShowHeader]);

  useEffect(() => {
    setPreventKeyDownEvent(isCheckpointOpen);
  }, [isCheckpointOpen, setPreventKeyDownEvent]);

  return (
    <div className='flex flex-row h-full w-full' id='game-layout' style={{
      backgroundColor: 'var(--bg-color)',
    }}>
      <div className='grow flex flex-col'>
        {!matchId && level.userId && !fullScreen &&
          <div className='flex items-center justify-center py-1 px-2 gap-1 block xl:hidden'>
            <h1
              className='whitespace-nowrap truncate'
              style={{
                color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)',
              }}
            >{level.name}</h1>
            {level.userMoves === level.leastMoves && <Complete className='-ml-1' />}
            by
            <div style={{ minWidth: 100 }}>
              <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
            </div>
          </div>
        }
        <Grid
          board={gameState.board}
          generateMovables={() => <>
            {gameState.blocks.map(block => {
              return (
                <Tile
                  handleClick={() => onCellClick(block.pos.x, block.pos.y)}
                  inHole={block.inHole}
                  key={`block-${block.id}`}
                  pos={block.pos}
                  tileType={block.type}
                />
              );
            })}
            <Tile
              atEnd={gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End}
              pos={gameState.pos}
              text={gameState.moveCount}
              tileType={TileType.Start}
            />
          </>}
          id={level._id.toString()}
          leastMoves={level.leastMoves}
          onCellClick={(x, y, rightClick) => {
            if (!rightClick) {
              onCellClick(x, y);
            }
          }}
        />
        <div className='gap-2 mx-3 z-10 transition-opacity flex'>
          {!disableCheckpoints && !fullScreen ?
            <>
              <button id='checkpointBtn' onClick={() => setIsCheckpointOpen(!isCheckpointOpen)}>
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
                </svg>
              </button>
              <CheckpointsModal
                closeModal={() => setIsCheckpointOpen(false)}
                isOpen={isCheckpointOpen}
              />
            </>
            :
            <div className='w-6' />
          }
          <div className='grow'>
            <Controls controls={controls} />
          </div>
          {!hideSidebar &&
            <button id='fullscreenBtn' onClick={() => {
              const el = document.getElementById('game-layout');
              const supportsFullScreen = el && !!el.requestFullscreen;

              // NB: some devices (eg iPhone) do not support full screen mode
              // in this case, just hide as much of the UX as possible
              if (!supportsFullScreen) {
                setFullScreen(f => !f);
              } else {
                if (fullScreen) {
                  document.exitFullscreen();
                } else {
                  el.requestFullscreen();
                }
              }
            }}>
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
          }
        </div>
      </div>
      {!hideSidebar && !fullScreen && <Sidebar level={level} />}
    </div>
  );
}
