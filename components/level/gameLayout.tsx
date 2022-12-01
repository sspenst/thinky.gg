import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Control from '../../models/control';
import Level from '../../models/db/level';
import FormattedUser from '../formattedUser';
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
  level: Level;
  matchId?: string;
  onCellClick: (x: number, y: number) => void;
}

export default function GameLayout({ controls, gameState, hideSidebar, level, matchId, onCellClick }: GameLayoutProps) {
  const [gameLayoutHeight, setGameLayoutHeight] = useState<number>();
  const gameLayoutRef = useRef<HTMLDivElement>(null);
  const [gameLayoutWidth, setGameLayoutWidth] = useState<number>();
  const [fullScreen, setFullScreen] = useState(false);
  const [mouseHover, setMouseHover] = useState(false);

  useEffect(() => {
    if (gameLayoutRef.current) {
      if (gameLayoutRef.current.offsetHeight > 0) {
        setGameLayoutHeight(gameLayoutRef.current.offsetHeight);
      }

      if (gameLayoutRef.current.offsetWidth > 0){
        setGameLayoutWidth(gameLayoutRef.current.offsetWidth);
      }
    }
  }, [
    fullScreen,
    gameLayoutRef.current?.offsetHeight,
    gameLayoutRef.current?.offsetWidth,
  ]);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const squareSize = !gameLayoutHeight || !gameLayoutWidth ? 0 :
    gameState.width / gameState.height > gameLayoutWidth / gameLayoutHeight ?
      Math.floor(gameLayoutWidth / gameState.width) : Math.floor(gameLayoutHeight / gameState.height);
  const borderWidth = Math.round(squareSize / 40) || 1;

  return (
    <div className='flex flex-row h-full w-full'>
      <div
        className='flex grow flex-col h-full relative'
        onMouseEnter={() => setMouseHover(true)}
        onMouseLeave={() => setMouseHover(false)}
      >
        {!matchId && level.userId &&
          <div className='flex flex-row items-center justify-center p-2 gap-1 block xl:hidden'>
            <h1>{level.name} by</h1>
            <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
          </div>
        }
        <div className='grow' id='game-layout' ref={gameLayoutRef}>
          {/* NB: need a fixed div here so the actual content won't affect the size of the gameLayoutRef */}
          {gameLayoutHeight && gameLayoutWidth &&
            <div className='fixed'>
              <div className='flex flex-col items-center justify-center overflow-hidden' style={{
                height: gameLayoutHeight,
                width: gameLayoutWidth,
              }}>
                <div
                  className='relative'
                  style={{
                    height: squareSize * gameState.height,
                    width: squareSize * gameState.width,
                  }}
                >
                  <Grid
                    board={gameState.board}
                    borderWidth={borderWidth}
                    gameState={gameState}
                    leastMoves={level.leastMoves}
                    onCellClick={onCellClick}
                    squareSize={squareSize}
                  />
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
                </div>
              </div>
            </div>
          }
        </div>
        <Controls controls={controls} />
        {!hideSidebar &&
          <button
            className={classNames(
              'transition-opacity absolute bottom-0 right-0 m-3 cursor-pointer rounded-md hidden xl:block z-10',
              { 'opacity-0': !mouseHover },
            )}
            onClick={() => setFullScreen(f => !f)}
          >
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
      {!hideSidebar && !fullScreen && <Sidebar />}
    </div>
  );
}
