import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import SquareState from '../../models/squareState';
import { teko } from '../../pages/_app';
import Player from './player';
import Square from './square';

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

  const borderWidth = Math.round(squareSize / 40) || 1;
  const grid = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileType = board[y][x].levelDataType;
      const text = tileType === TileType.End ? leastMoves :
        board[y][x].text.length === 0 ? undefined :
          board[y][x].text[board[y][x].text.length - 1];

      grid.push(
        tileType === TileType.Start ?
          <Player
            borderWidth={borderWidth}
            className={cellClassName ? cellClassName(x, y) : undefined}
            gameState={{
              actionCount: 0,
              blocks: [],
              board: [],
              height: height,
              moveCount: 0,
              moves: [],
              pos: new Position(x, y),
              width: width,
            }}
            handleClick={() => onCellClick(x, y, false)}
            key={`grid-${x}-${y}`}
            leastMoves={leastMoves}
            size={squareSize}
            tileType={TileType.Default}
          />
          :
          <div
            className={classNames('absolute', cellClassName ? cellClassName(x, y) : undefined)}
            key={`grid-${x}-${y}`}
            style={{
              left: squareSize * x + (!classic ? borderWidth : TileTypeHelper.isRaised(tileType) ? 2 * borderWidth : 0),
              top: squareSize * y + (!classic ? borderWidth : TileTypeHelper.isRaised(tileType) ? 0 : 2 * borderWidth),
            }}
          >
            <Square
              borderWidth={borderWidth}
              handleClick={(rightClick: boolean) => onCellClick(x, y, rightClick)}
              leastMoves={leastMoves}
              size={squareSize}
              text={text}
              tileType={tileType}
            />
          </div>
      );
    }
  }

  return (
    <div className={classNames('grow flex items-center justify-center overflow-hidden', { [teko.className]: classic })} id={gridId}>
      {squareSize !== 0 &&
        <div
          className='relative'
          style={{
            height: squareSize * height,
            width: squareSize * width,
          }}
        >
          {grid}
          {generateMovables ? generateMovables(borderWidth, squareSize) : null}
        </div>
      }
    </div>
  );
}
