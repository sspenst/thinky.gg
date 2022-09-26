import React, { useContext, useEffect, useRef, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { PageContext } from '../../contexts/pageContext';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';
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
  const [hasSidebar, setHasSidebar] = useState<boolean>();
  const hasSidebarOption = useHasSidebarOption();
  const { showSidebar } = useContext(PageContext);

  useEffect(() => {
    setHasSidebar(hasSidebarOption && showSidebar);
  }, [hasSidebarOption, showSidebar]);

  useEffect(() => {
    if (gameLayoutRef.current) {
      setGameLayoutHeight(gameLayoutRef.current.offsetHeight);
      setGameLayoutWidth(gameLayoutRef.current.offsetWidth);
    }
  }, [
    gameLayoutRef.current?.offsetHeight,
    gameLayoutRef.current?.offsetWidth,
    hasSidebar,
  ]);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const squareSize = !gameLayoutHeight || !gameLayoutWidth ? 0 :
    gameState.width / gameState.height > gameLayoutWidth / gameLayoutHeight ?
      Math.floor(gameLayoutWidth / gameState.width) : Math.floor(gameLayoutHeight / gameState.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  if (hasSidebar === undefined) {
    return null;
  }

  return (
    <div className='flex flex-row h-full w-full'>
      <div className='flex grow flex-col h-full'>
        {!hasSidebar && level.userId &&
          <div className='flex flex-row items-center justify-center p-2 gap-1'>
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
                <div style={{ position: 'relative' }}>
                  {gameState.blocks.map(block => <Block
                    block={block}
                    borderWidth={squareMargin}
                    key={`block-${block.id}`}
                    onClick={() => onCellClick(block.pos.x, block.pos.y)}
                    size={squareSize}
                  />)}
                  <Player
                    borderWidth={squareMargin}
                    gameState={gameState}
                    leastMoves={level.leastMoves}
                    size={squareSize}
                  />
                  <Grid
                    board={gameState.board}
                    borderWidth={squareMargin}
                    gameState={gameState}
                    leastMoves={level.leastMoves}
                    onCellClick={onCellClick}
                    squareSize={squareSize}
                  />
                </div>
              </div>
            </div>
          }
        </div>
        <Controls controls={controls} />
      </div>
      {hasSidebar && <Sidebar />}
    </div>
  );
}
