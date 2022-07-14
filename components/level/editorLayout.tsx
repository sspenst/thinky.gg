import Control from '../../models/control';
import Controls from './controls';
import Dimensions from '../../constants/dimensions';
import EditorGrid from './editorGrid';
import Level from '../../models/db/level';
import React from 'react';

interface EditorLayoutProps {
  controls?: Control[];
  level: Level;
  onClick?: (index: number, clear: boolean) => void;
}

export default function EditorLayout({ controls, level, onClick }: EditorLayoutProps) {
  // NB: EditorLayout must exist within a div with id 'game-container'
  const gameContainerDiv = document.getElementById('game-container');

  if (!gameContainerDiv) {
    return null;
  }

  const gameContainerHeight = gameContainerDiv.offsetHeight;
  const gameContainerWidth = gameContainerDiv.offsetWidth;

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const maxGameHeight = gameContainerHeight - (controls ? Dimensions.ControlHeight : 0);
  const maxGameWidth = gameContainerWidth;
  const squareSize = level.width / level.height > maxGameWidth / maxGameHeight ?
    Math.floor(maxGameWidth / level.width) : Math.floor(maxGameHeight / level.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <>
      <div style={{
        display: 'table',
        height: maxGameHeight,
        position: 'absolute',
        width: maxGameWidth,
      }}>
        <div style={{
          display: 'table-cell',
          height: '100%',
          verticalAlign: 'middle',
          width: '100%',
        }}>
          <div style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <EditorGrid
              borderWidth={squareMargin}
              level={level}
              onClick={onClick}
              squareSize={squareSize}
            />
          </div>
        </div>
      </div>
      {!controls ? null :
        <div style={{
          bottom: 0,
          display: 'table',
          height: Dimensions.ControlHeight,
          position: 'absolute',
          width: maxGameWidth,
        }}>
          <Controls controls={controls}/>
        </div>
      }
    </>
  );
}
