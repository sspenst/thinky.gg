import { useState, useEffect } from 'react';
import React from 'react';
import Controls from './Controls';
import Content from './Content';
import Control from '../Models/Control';

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

export default function App() {
  const [controls, setControls] = useState<Control[]>([]);
  const windowSize = useWindowSize();
  let gameHeight = windowSize.height;
  let gameWidth = windowSize.width;

  if (!gameHeight || !gameWidth) {
    // avoid an error message by not rendering when size is undefined
    return null;
  }

  const controlsHeight = 64;
  const contentHeight = gameHeight - controlsHeight;

  return (<>
    <div style={{
      position: 'fixed',
      top: 0,
      height: contentHeight,
      width: gameWidth,
      overflowY: 'scroll',
    }}>
      <Content
        height={contentHeight}
        setControls={setControls}
        width={gameWidth}
      />
    </div>
    <div style={{
      position: 'fixed',
      bottom: 0,
      height: controlsHeight,
      width: gameWidth,
    }}>
      <Controls
        controls={controls}
        height={controlsHeight}
      />
    </div>
  </>);
}
