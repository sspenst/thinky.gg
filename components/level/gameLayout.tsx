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
  level: Level;
  onCellClick: (x: number, y: number) => void;
}

export default function GameLayout({ controls, gameState, level, onCellClick }: GameLayoutProps) {
  const [gameLayoutHeight, setGameLayoutHeight] = useState<number>();
  const gameLayoutRef = useRef<HTMLDivElement>(null);
  const [gameLayoutWidth, setGameLayoutWidth] = useState<number>();

  useEffect(() => {
    if (gameLayoutRef.current) {
      setGameLayoutHeight(gameLayoutRef.current.offsetHeight);
      setGameLayoutWidth(gameLayoutRef.current.offsetWidth);
    }
  }, [
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
      <div className='flex grow flex-col h-full'>
        {level.userId &&
          <div className='flex flex-row items-center justify-center p-2 gap-1 block xl:hidden'>
            <h1>{level.name} by</h1>
            <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
          </div>
        }
        <div className='grow' id='game-layout' ref={gameLayoutRef}>
          {/* NB: need a fixed div here so the actual content won't affect the size of the gameLayoutRef */}
          {gameLayoutHeight && gameLayoutWidth &&
            <div className='fixed'>
              <div className='flex flex-col items-center justify-center' style={{
                height: gameLayoutHeight,
                width: gameLayoutWidth,
              }}>
                <div style={{
                  height: squareSize * gameState.height,
                  position: 'relative',
                  width: squareSize * gameState.width,
                }}>
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
      </div>
      <Sidebar />
    </div>
  );
}
