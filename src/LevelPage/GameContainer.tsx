import React from 'react';
import Dimensions from '../Constants/Dimensions';
import Level from '../DataModels/Pathology/Level';
import Game from './Game';

interface GameContainerProps {
  height: number;
  level: Level;
  width: number;
}

export default function GameContainer({ height, level, width }: GameContainerProps) {
  function getSquareSize() {
    const gameHeight = height - controlSize;
    const gameWidth = width;
    let squareSize = 0;

    if (level.width / level.height > gameWidth / gameHeight) {
      squareSize = gameWidth / level.width;
    } else {
      squareSize = gameHeight / level.height;
    }

    // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
    return Math.floor(squareSize);
  }
  
  const maxControlSize = Math.floor(width / 6);
  const controlSize = Dimensions.ControlSize < maxControlSize ? Dimensions.ControlSize : maxControlSize;
  const squareSize = getSquareSize();
  const gameWidth = squareSize * level.width;
  const gameHeight = squareSize * level.height;
  const gameTop = (height - controlSize - gameHeight) / 2 + Dimensions.MenuHeight;
  const gameLeft = (width - gameWidth) / 2;

  return (
    <Game
      controlSize={controlSize}
      height={gameHeight}
      left={gameLeft}
      level={level}
      squareSize={squareSize}
      top={gameTop}
      width={gameWidth}
    />
  )
}
