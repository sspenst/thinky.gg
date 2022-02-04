import './index.css';
import { useState, useEffect } from 'react';
import Game from './Game';

function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });
  
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
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

export default function GameContainer(props) {
  const windowSize = useWindowSize();
  let gameWidth = windowSize.width;
  let gameHeight = windowSize.height;
  let squareSize = undefined;

  if (!gameWidth) {
    // avoid an error message by not rendering when size is undefined
    return null;
  }

  // calculate sizes
  if (props.level.width / props.level.height > gameWidth / gameHeight) {
    gameHeight = gameWidth * props.level.height / props.level.width;
    squareSize = gameWidth / props.level.width;
  } else {
    gameWidth = gameHeight * props.level.width / props.level.height;
    squareSize = gameHeight / props.level.height;
  }

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
