import React, { useContext } from 'react';
import Block from './block';
import Control from '../../models/control';
import Controls from './controls';
import Dimensions from '../../constants/dimensions';
import { GameState } from './game';
import Grid from './grid';
import { PageContext } from '../../contexts/pageContext';
import Player from './player';

interface GameLayoutProps {
  controls: Control[];
  gameState: GameState;
  leastMoves: number;
}

export default function GameLayout({ controls, gameState, leastMoves }: GameLayoutProps) {
  const { windowSize } = useContext(PageContext);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const maxGameHeight = windowSize.height - Dimensions.ControlHeight;
  const maxGameWidth = windowSize.width;
  const squareSize = gameState.width / gameState.height > maxGameWidth / maxGameHeight ?
    Math.floor(maxGameWidth / gameState.width) : Math.floor(maxGameHeight / gameState.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <div style={{
      height: windowSize.height,
      width: windowSize.width,
    }}>
      <div style={{
        position: 'absolute',
        overflow: 'hidden',
        left: Math.ceil((maxGameWidth - squareSize * gameState.width) / 2),
        top: Math.ceil((maxGameHeight - squareSize * gameState.height) / 2) + Dimensions.MenuHeight,
      }}>
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
            leastMoves={leastMoves}
            size={squareSize}
          />
          <Grid
            board={gameState.board}
            borderWidth={squareMargin}
            gameState={gameState}
            leastMoves={leastMoves}
            squareSize={squareSize}
          />
        </>
      </div>
      <Controls controls={controls}/>
    </div>
  );
}
