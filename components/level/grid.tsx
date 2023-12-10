import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import { teko } from '@root/helpers/getFont';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import { getSolveStateFunction } from './solutionStates/helpers';
import Tile from './tile/tile';

interface GridProps {
  cellClassName?: (x: number, y: number) => string | undefined;
  gameState: GameState;
  id: string;
  leastMoves: number;
  onCellClick?: (x: number, y: number, rightClick: boolean) => void;
}

export default function Grid({ cellClassName, gameState, id, leastMoves, onCellClick }: GridProps) {
  const { game, theme } = useContext(AppContext);
  const classic = theme === Theme.Classic;
  const height = gameState.board.length;
  const width = gameState.board[0].length;

  const gridId = `grid-${id}`;

  const [tileSize, setTileSize] = useState(0);
  const borderWidth = Math.round(tileSize / 40) || 1;
  const innerTileSize = tileSize - 2 * borderWidth;

  useEffect(() => {
    const el = document.getElementById(gridId);

    if (!el) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentBoxSize
      const gridHeight = entries[0].contentBoxSize[0].blockSize;
      const gridWidth = entries[0].contentBoxSize[0].inlineSize;

      // calculate the tile size based on the available game space and the level dimensions
      // NB: forcing the tile size to be an integer allows the block animations to travel along actual pixels
      const newTileSize = !gridHeight || !gridWidth ? 0 :
        width / height > gridWidth / gridHeight ?
          Math.floor(gridWidth / width) : Math.floor(gridHeight / height);

      // NB: calculting tile size here instead of setting grid height/width avoids rendering on every resize
      setTileSize(newTileSize);
    });

    resizeObserver.observe(el);

    return () => {
      resizeObserver.unobserve(el);
    };
  }, [gridId, height, width]);

  const tiles = [];
  const blocks: { [id: number]: JSX.Element } = {};

  for (let y = 0; y < gameState.board.length; y++) {
    for (let x = 0; x < gameState.board[y].length; x++) {
      const tileState = gameState.board[y][x];
      const tileType = tileState.tileType;
      const text = tileType === TileType.Start ? 0 :
        tileType === TileType.End ? leastMoves :
          tileState.text.length === 0 ? undefined :
            tileState.text[tileState.text.length - 1];

      tiles.push(
        <Tile
          className={cellClassName ? cellClassName(x, y) : undefined}
          handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
          key={`tile-${y}-${x}`}
          pos={new Position(x, y)}
          text={text}
          tileType={tileType}
        />
      );

      if (tileState.block) {
        blocks[tileState.block.id] = (
          <Tile
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            key={`block-${tileState.block.id}`}
            pos={new Position(x, y)}
            tileType={tileState.block.tileType}
          />
        );
      }

      if (tileState.blockInHole) {
        blocks[tileState.blockInHole.id] = (
          <Tile
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            inHole={true}
            key={`block-${tileState.blockInHole.id}`}
            pos={new Position(x, y)}
            tileType={tileState.blockInHole.tileType}
          />
        );
      }
    }
  }

  return (
    <div className={classNames('grow flex items-center justify-center overflow-hidden', { [teko.className]: classic })} id={gridId}>
      {tileSize !== 0 &&
        <GridContext.Provider value={{
          borderWidth: borderWidth,
          innerTileSize: innerTileSize,
          leastMoves: leastMoves,
          tileSize: tileSize,
        }}>
          <div
            className='absolute overflow-hidden'
            style={{
              height: tileSize * height,
              width: tileSize * width,
            }}
          >
            {tiles}
            {Object.values(blocks)}
            {gameState.pos &&
              <Tile
                atEnd={getSolveStateFunction(game)(gameState)}
                pos={gameState.pos}
                text={gameState.moves.length}
                tileType={TileType.Start}
              />
            }
          </div>
        </GridContext.Provider>
      }
    </div>
  );
}
