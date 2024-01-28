import { Game } from '@root/constants/Games';
import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import { teko } from '@root/helpers/getFont';
import Position from '@root/models/position';
import classNames from 'classnames';
import { useTheme } from 'next-themes';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import Tile from './tile/tile';

interface GridProps {
  gameOverride?: Game;
  themeOverride?: Theme;
  cellClassName?: (x: number, y: number) => string | undefined;
  cellStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  disableAnimation?: boolean;
  gameState: GameState;
  hideText?: boolean;
  id: string;
  leastMoves: number;
  onCellClick?: (x: number, y: number, rightClick: boolean) => void;
}

export default function Grid({ cellClassName, cellStyle, disableAnimation, gameOverride, gameState, hideText, id, leastMoves, onCellClick, themeOverride }: GridProps) {
  const { game: appGame, deviceInfo } = useContext(AppContext);
  const { theme: appTheme } = useTheme();
  const game = (gameOverride || appGame);
  const theme = (themeOverride || appTheme);
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

      if (tileType === TileType.Default && tileState.block === undefined && tileState.blockInHole === undefined && tileState.text.length === 0) {
        continue;
      }

      const text = tileType === TileType.Player ? 0 :
        tileType === TileType.Exit ? leastMoves :
          tileState.text.length === 0 ? undefined :
            tileState.text[tileState.text.length - 1];

      tiles.push(
        <Tile
          className={cellClassName ? cellClassName(x, y) : undefined}
          disableAnimation={disableAnimation}
          handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
          key={`tile-${y}-${x}`}
          pos={new Position(x, y)}
          style={cellStyle ? cellStyle(x, y) : undefined}
          text={text}
          tileType={tileType}
          game={game}
          theme={theme as Theme}
          visited={tileState.text.length > 0}
        />
      );

      if (tileState.block) {
        const tileAtPosition = gameState.board[y][x];

        blocks[tileState.block.id] = (
          <Tile
            className={cellClassName ? cellClassName(x, y) : undefined}
            disableAnimation={disableAnimation}
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            key={`block-${tileState.block.id}`}
            onTopOf={tileAtPosition.tileType}
            pos={new Position(x, y)}
            style={cellStyle ? cellStyle(x, y) : undefined}
            tileType={tileState.block.tileType}
            game={game}
            theme={theme as Theme}
          />
        );
      }

      if (tileState.blockInHole) {
        blocks[tileState.blockInHole.id] = (
          <Tile
            className={cellClassName ? cellClassName(x, y) : undefined}
            disableAnimation={disableAnimation}
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            inHole={true}
            key={`block-${tileState.blockInHole.id}`}
            pos={new Position(x, y)}
            style={cellStyle ? cellStyle(x, y) : undefined}
            tileType={tileState.blockInHole.tileType}
            game={game}
            theme={theme as Theme}
          />
        );
      }
    }
  }

  const onBgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const x = Math.floor(e.nativeEvent.offsetX / tileSize);
    const y = Math.floor(e.nativeEvent.offsetY / tileSize);
    const rightClick = e.button === 2;

    onCellClick && onCellClick(x, y, rightClick);
  };

  const onBgTouch = (e: React.TouchEvent<HTMLDivElement>) => {

  };

  const solidBg = (
    <div
      onClick={onBgClick }

      className='absolute overlay-grid'
      style={{
        backgroundColor: 'var(--level-grid)',
        backgroundSize: `${tileSize}px ${tileSize}px`,
        backgroundPosition: `${-borderWidth}px ${-borderWidth}px`,
        backgroundImage: `
          linear-gradient(to right, black ${borderWidth * 2 }px, transparent ${borderWidth * 2 }px),
          linear-gradient(to bottom, black ${borderWidth * 2}px, transparent ${borderWidth * 2 }px)
        `,

        height: tileSize * height,
        width: tileSize * width,
      }}
    />
  );

  return (
    <div className={classNames('grow flex items-center justify-center overflow-hidden ' + theme, { [teko.className]: classic })} id={gridId}>
      {tileSize !== 0 &&
        <GridContext.Provider value={{
          borderWidth: borderWidth,
          hideText: hideText,
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
            {solidBg}
            {tiles}
            {Object.values(blocks)}
            {gameState.pos &&
              <Tile
                atEnd={game.isComplete(gameState)}
                className={cellClassName ? cellClassName(gameState.pos.x, gameState.pos.y) : undefined}
                disableAnimation={disableAnimation}
                handleClick={onCellClick ? (rightClick: boolean) => onCellClick(gameState.pos.x, gameState.pos.y, rightClick) : undefined}
                pos={gameState.pos}
                style={cellStyle ? cellStyle(gameState.pos.x, gameState.pos.y) : undefined}
                text={gameState.moves.length}
                tileType={TileType.Player}
                game={game}
                theme={theme as Theme}
              />
            }
          </div>
        </GridContext.Provider>
      }
    </div>
  );
}
