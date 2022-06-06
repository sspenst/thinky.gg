import React, { useContext } from 'react';
import Block from './block';
import Control from '../../models/control';
import Controls from './controls';
import Dimensions from '../../constants/dimensions';
import EditGrid from './editGrid';
import { GameState } from './game';
import Grid from './grid';
import Level from '../../models/db/level';
import { PageContext } from '../../contexts/pageContext';
import Player from './player';

interface GameLayoutProps {
  controls: Control[];
  gameState?: GameState;
  level: Level;
  onClick?: (index: number, clear: boolean) => void;
}

export default function GameLayout({ controls, gameState, level, onClick }: GameLayoutProps) {
  const { windowSize } = useContext(PageContext);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const maxGameHeight = windowSize.height - Dimensions.ControlHeight;
  const maxGameWidth = windowSize.width;
  const squareSize = level.width / level.height > maxGameWidth / maxGameHeight ?
    Math.floor(maxGameWidth / level.width) : Math.floor(maxGameHeight / level.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <div style={{
      height: windowSize.height,
      width: windowSize.width,
    }}>
      <div style={{
        position: 'absolute',
        overflow: 'hidden',
        left: Math.ceil((maxGameWidth - squareSize * level.width) / 2),
        top: Math.ceil((maxGameHeight - squareSize * level.height) / 2) + Dimensions.MenuHeight,
      }}>
        {gameState ?
          <>
            {gameState.blocks.map(block => <Block
              block={block}
              borderWidth={squareMargin}
              key={block.id}
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
              level={level}
              squareSize={squareSize}
            />
          </>
          :
          !onClick ? null :
            <EditGrid
              borderWidth={squareMargin}
              level={level}
              onClick={onClick}
              squareSize={squareSize}
            />
        }
      </div>
      <Controls controls={controls}/>
    </div>
  );
}
