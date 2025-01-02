import { initGameState } from '@root/helpers/gameStateHelpers';
import React from 'react';
import Control from '../../models/control';
import Level from '../../models/db/level';
import Controls from './controls';
import Grid from './grid';

interface BasicLayoutProps {
  cellClassName?: (index: number) => string | undefined;
  cellStyle?: (index: number) => React.CSSProperties | undefined;
  controls?: Control[];
  hideText?: boolean;
  id: string;
  level: Level;
  onClick?: (index: number, rightClick: boolean, isDragging?: boolean) => void;
}

export default function BasicLayout({ cellClassName, cellStyle, controls, hideText, id, level, onClick }: BasicLayoutProps) {
  const gameState = initGameState(level.data);

  return (
    <>
      <Grid
        cellClassName={(x, y) => cellClassName ? cellClassName(y * (level.width + 1) + x) : undefined}
        cellStyle={(x, y) => cellStyle ? cellStyle(y * (level.width + 1) + x) : undefined}
        disableAnimation
        gameState={gameState}
        hideText={hideText}
        id={id}
        leastMoves={level.leastMoves}
        onCellDrag={(x, y, isDragging) => {
          if (onClick) {
            const index = y * (level.width + 1) + x;

            onClick(index, false, isDragging);
          }
        }}
        onCellMouseDown={(x, y, rightClick) => {
          if (onClick) {
            const index = y * (level.width + 1) + x;

            onClick(index, rightClick);
          }
        }}
      />
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
