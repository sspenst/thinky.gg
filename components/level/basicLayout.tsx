import { AppContext } from '@root/contexts/appContext';
import { initGameState } from '@root/helpers/gameStateHelpers';
import React, { useContext } from 'react';
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
  const { deviceInfo } = useContext(AppContext);

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
        onCellMouseDown={deviceInfo.isMobile ? (x, y, rightClick) => {
          if (onClick) {
            const index = y * (level.width + 1) + x;

            onClick(index, rightClick);
          }
        } : undefined}
        onCellClick={!deviceInfo.isMobile ? (x, y, rightClick) => {
          if (onClick) {
            const index = y * (level.width + 1) + x;

            onClick(index, rightClick);
          }
        } : undefined}

      />
      {!controls ? null : <Controls controls={controls} />}
    </>
  );
}
