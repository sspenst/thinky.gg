import React, { useContext } from 'react';
import { PageContext } from '../../contexts/pageContext';

interface GameContainerProps {
  children: JSX.Element;
}

export default function GameContainer({ children }: GameContainerProps) {
  const { windowSize } = useContext(PageContext);

  return (
    <div id='game-container' style={{ height: windowSize.height, width: windowSize.width }}>
      {children}
    </div>
  );
}
