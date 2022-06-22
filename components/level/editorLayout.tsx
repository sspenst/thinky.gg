import React, { useContext } from 'react';
import Control from '../../models/control';
import Controls from './controls';
import Dimensions from '../../constants/dimensions';
import EditorGrid from './editorGrid';
import Level from '../../models/db/level';
import { PageContext } from '../../contexts/pageContext';

interface EditorLayoutProps {
  controls: Control[];
  level: Level;
  onClick: (index: number, clear: boolean) => void;
}

export default function EditorLayout({ controls, level, onClick }: EditorLayoutProps) {
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
        left: Math.floor((maxGameWidth - squareSize * level.width) / 2),
        top: Math.floor((maxGameHeight - squareSize * level.height) / 2) + Dimensions.MenuHeight,
      }}>
        <EditorGrid
          borderWidth={squareMargin}
          level={level}
          onClick={onClick}
          squareSize={squareSize}
        />
      </div>
      <Controls controls={controls}/>
    </div>
  );
}
