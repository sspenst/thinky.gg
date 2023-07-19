import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import SquareState from '../../models/squareState';
import { teko } from '../../pages/_app';
import Tile from './tile';

interface GridProps {
  board: SquareState[][];
  cellClassName?: (x: number, y: number) => string | undefined;
  generateMovables?: (borderWidth: number, squareSize: number) => JSX.Element;
  id: string;
  leastMoves: number;
  onCellClick: (x: number, y: number, rightClick: boolean) => void;
}

export default function Grid({ board, cellClassName, generateMovables, id, leastMoves, onCellClick }: GridProps) {
  const { theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const height = board.length;
  const width = board[0].length;
  const gridId = `grid-${id}`;
  const [squareSize, setSquareSize] = useState(0);
  const borderWidth = Math.round(squareSize / 40) || 1;

  useEffect(() => {
    const el = document.getElementById(gridId);

    if (!el) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentBoxSize
      const gridHeight = entries[0].contentBoxSize[0].blockSize;
      const gridWidth = entries[0].contentBoxSize[0].inlineSize;

      // calculate the square size based on the available game space and the level dimensions
      // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
      const newSquareSize = !gridHeight || !gridWidth ? 0 :
        width / height > gridWidth / gridHeight ?
          Math.floor(gridWidth / width) : Math.floor(gridHeight / height);

      // NB: setting square size here instead of gridHeight / gridWidth avoids rendering on every resize
      setSquareSize(newSquareSize);
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.unobserve(el);
    };
  }, [gridId, height, width]);

  return (
    <div className={classNames('grow flex items-center justify-center overflow-hidden', { [teko.className]: classic })} id={gridId}>
      {squareSize !== 0 &&
        <div
          className='absolute'
          style={{
            height: squareSize * height,
            width: squareSize * width,
          }}
        >
          {board.map((row, y) => row.map((squareState, x) => {
            const tileType = squareState.tileType;
            const text = tileType === TileType.Start ? 0 :
              tileType === TileType.End ? leastMoves :
                squareState.text.length === 0 ? undefined :
                  squareState.text[squareState.text.length - 1];

            return (
              <Tile
                borderWidth={borderWidth}
                className={cellClassName ? cellClassName(x, y) : undefined}
                handleClick={(rightClick: boolean) => onCellClick(x, y, rightClick)}
                key={`tile-${y}-${x}`}
                leastMoves={leastMoves}
                pos={new Position(x, y)}
                size={squareSize}
                text={text}
                tileType={tileType}
              />
            );
          }))}
          {generateMovables ? generateMovables(borderWidth, squareSize) : null}
        </div>
      }
    </div>
  );
}
