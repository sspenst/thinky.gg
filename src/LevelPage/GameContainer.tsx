import React from 'react';
import Game from './Game';
import Level from '../DataModels/Pathology/Level';
import Dimensions from '../Constants/Dimensions';

interface GameContainerProps {
  goToLevelSelect: () => void;
  height: number;
  level: Level;
  width: number;
}

export default function GameContainer(props: GameContainerProps) {
  const x = props.level.width;
  const y = props.level.height;
  let height = props.height;
  let width = props.width;
  let squareSize = undefined;

  // calculate square size
  if (x / y > width / height) {
    squareSize = width / x;
  } else {
    squareSize = height / y;
  }

  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  squareSize = Math.floor(squareSize);
  width = squareSize * x;
  height = squareSize * y;

  const top = (props.height - height) / 2 + Dimensions.MenuHeight;
  const left = (props.width - width) / 2;

  return (
    <div
      style={{
        position: 'fixed',
        height: height,
        width: width,
        top: top,
        left: left,
      }}
    >
      <Game
        goToLevelSelect={props.goToLevelSelect}
        level={props.level}
        squareSize={squareSize}
        width={width}
      />
    </div>
  );
}
