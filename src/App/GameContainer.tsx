import './index.css';
import { useState, useEffect } from 'react';
import React from 'react';
import Game from './Game';
import Level from '../Models/Level';

interface GameContainerProps {
  goToLevelSelect: () => void;
  goToNextLevel: () => void;
  level: Level;
}

interface WindowSize {
  height: number | undefined;
  width: number | undefined;
}

function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState<WindowSize>({
    height: undefined,
    width: undefined,
  });
  
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }
    // Add event listener
    window.addEventListener('resize', handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  
  return windowSize;
}

export default function GameContainer(props: GameContainerProps) {
  const windowSize = useWindowSize();
  let gameWidth = windowSize.width;
  let gameHeight = windowSize.height;
  let squareSize = undefined;

  if (!gameHeight || !gameWidth) {
    // avoid an error message by not rendering when size is undefined
    return null;
  }

  // calculate square size
  if (props.level.width / props.level.height > gameWidth / gameHeight) {
    squareSize = gameWidth / props.level.width;
  } else {
    squareSize = gameHeight / props.level.height;
  }

  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  squareSize = Math.floor(squareSize);
  gameWidth = squareSize * props.level.width;
  gameHeight = squareSize * props.level.height;

  return (
    <div
      style={{width: gameWidth, height: gameHeight}}
      className={`centered`}
    >
      <Game
        squareSize={squareSize}
        {...props}
      />
    </div>
  );
}
