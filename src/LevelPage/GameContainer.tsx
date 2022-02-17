import React from 'react';
import Dimensions from '../Constants/Dimensions';
import Level from '../DataModels/Pathology/Level';
import Game from './Game';

interface GameContainerProps {
  height: number;
  level: Level;
  width: number;
}

export default function GameContainer(props: GameContainerProps) {
  function getSquareSize() {
    const gameHeight = props.height - controlSize;
    const gameWidth = props.width;
    let squareSize = 0;

    if (props.level.width / props.level.height > gameWidth / gameHeight) {
      squareSize = gameWidth / props.level.width;
    } else {
      squareSize = gameHeight / props.level.height;
    }

    // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
    return Math.floor(squareSize);
  }
  
  const maxControlSize = Math.floor(props.width / 6);
  const controlSize = Dimensions.ControlSize < maxControlSize ? Dimensions.ControlSize : maxControlSize;
  const squareSize = getSquareSize();
  const gameWidth = squareSize * props.level.width;
  const gameHeight = squareSize * props.level.height;
  const gameTop = (props.height - controlSize - gameHeight) / 2 + Dimensions.MenuHeight;
  const gameLeft = (props.width - gameWidth) / 2;

  return (
    <Game
      controlSize={controlSize}
      height={gameHeight}
      left={gameLeft}
      level={props.level}
      squareSize={squareSize}
      top={gameTop}
      width={gameWidth}
    />
  )
}
