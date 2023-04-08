import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import LevelUtil from '../../constants/levelDataType';
import Theme from '../../constants/theme';
import isTheme from '../../helpers/isTheme';
import SquareState from '../../models/squareState';
import { teko } from '../../pages/_app';
import Square from './square';

interface GridProps {
  board: SquareState[][];
  generateMovables?: (borderWidth: number, squareSize: number) => JSX.Element;
  leastMoves: number;
  onCellClick: (x: number, y: number, rightClick: boolean) => void;
}

export default function Grid({ board, generateMovables, leastMoves, onCellClick }: GridProps) {
  const classic = isTheme(Theme.Classic);
  const grid = [];
  const [gridHeight, setGridHeight] = useState<number>();
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState<number>();
  const height = board.length;
  const width = board[0].length;

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      if (gridRef.current) {
        if (gridRef.current.offsetHeight > 0) {
          setGridHeight(gridRef.current.offsetHeight);
        }

        if (gridRef.current.offsetWidth > 0) {
          setGridWidth(gridRef.current.offsetWidth);
        }
      }
    }

    // Add event listener
    window.addEventListener('resize', handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  // NB: kind of a hack for the tutorial...
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [gridRef.current?.offsetHeight, gridRef.current?.offsetWidth]);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const squareSize = !gridHeight || !gridWidth ? 0 :
    width / height > gridWidth / gridHeight ?
      Math.floor(gridWidth / width) : Math.floor(gridHeight / height);
  const borderWidth = Math.round(squareSize / 40) || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const levelDataType = board[y][x].levelDataType;
      const text = levelDataType === LevelUtil.End ? leastMoves :
        board[y][x].text.length === 0 ? undefined :
          board[y][x].text[board[y][x].text.length - 1];

      grid.push(
        <div
          className='absolute'
          key={`grid-${x}-${y}`}
          style={{
            left: squareSize * x + (!classic ? borderWidth : LevelUtil.isRaised(levelDataType) ? 2 * borderWidth : 0),
            top: squareSize * y + (!classic ? borderWidth : LevelUtil.isRaised(levelDataType) ? 0 : 2 * borderWidth),
          }}
        >
          <Square
            borderWidth={borderWidth}
            handleClick={(rightClick: boolean) => onCellClick(x, y, rightClick)}
            leastMoves={leastMoves}
            levelDataType={levelDataType}
            size={squareSize}
            text={text}
          />
        </div>
      );
    }
  }

  return (
    <div className={classNames('grow', { [teko.className]: isTheme(Theme.Classic) })} id='grid' ref={gridRef}>
      {/* NB: need a fixed div here so the actual content won't affect the size of the gridRef */}
      {gridHeight && gridWidth &&
        <div className='fixed'>
          <div className='flex flex-col items-center justify-center overflow-hidden' style={{
            height: gridHeight,
            width: gridWidth,
          }}>
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
          </div>
        </div>
      }
    </div>
  );
}
