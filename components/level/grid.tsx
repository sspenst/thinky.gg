import { Game } from '@root/constants/Games';
import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import { teko } from '@root/helpers/getFont';
import Position from '@root/models/position';
import classNames from 'classnames';
import { useTheme } from 'next-themes';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import Tile from './tile/tile';

interface GridProps {
  cellClassName?: (x: number, y: number) => string | undefined;
  cellStyle?: (x: number, y: number) => React.CSSProperties | undefined;
  disableAnimation?: boolean;
  gameOverride?: Game;
  gameState: GameState;
  hideText?: boolean;
  id: string;
  leastMoves: number;
  onCellClick?: (x: number, y: number, rightClick: boolean) => void;
  optimizeDom?: boolean;
  themeOverride?: Theme;
}

export default function Grid({ cellClassName, cellStyle, disableAnimation, gameOverride, gameState, hideText, id, leastMoves, onCellClick, optimizeDom, themeOverride }: GridProps) {
  const { game: appGame } = useContext(AppContext);
  const { theme: appTheme, resolvedTheme } = useTheme();
  const game = (gameOverride || appGame);
  const theme = (themeOverride || appTheme || resolvedTheme);
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

      const text = tileType === TileType.Player ? 0 :
        tileType === TileType.Exit ? leastMoves :
          tileState.text.length === 0 ? undefined :
            tileState.text[tileState.text.length - 1];

      // to optimize the DOM we can skip rendering default tiles with no text
      if (!(optimizeDom && tileType === TileType.Default && text === undefined)) {
        tiles.push(
          <Tile
            className={cellClassName ? cellClassName(x, y) : undefined}
            disableAnimation={disableAnimation}
            game={game}
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            key={`tile-${y}-${x}`}
            pos={new Position(x, y)}
            style={cellStyle ? cellStyle(x, y) : undefined}
            text={text}
            theme={theme as Theme}
            tileType={tileType}
            visited={tileState.text.length > 0}
          />
        );
      }

      if (tileState.block) {
        const tileAtPosition = gameState.board[y][x];

        blocks[tileState.block.id] = (
          <Tile
            className={cellClassName ? cellClassName(x, y) : undefined}
            disableAnimation={disableAnimation}
            game={game}
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            key={`block-${tileState.block.id}`}
            onTopOf={tileAtPosition.tileType}
            pos={new Position(x, y)}
            style={cellStyle ? cellStyle(x, y) : undefined}
            theme={theme as Theme}
            tileType={tileState.block.tileType}
          />
        );
      }

      if (tileState.blockInHole) {
        blocks[tileState.blockInHole.id] = (
          <Tile
            className={cellClassName ? cellClassName(x, y) : undefined}
            disableAnimation={disableAnimation}
            game={game}
            handleClick={onCellClick ? (rightClick: boolean) => onCellClick(x, y, rightClick) : undefined}
            inHole={true}
            key={`block-${tileState.blockInHole.id}`}
            pos={new Position(x, y)}
            style={cellStyle ? cellStyle(x, y) : undefined}
            theme={theme as Theme}
            tileType={tileState.blockInHole.tileType}
          />
        );
      }
    }
  }

  const getBackground = useCallback(() => {
    if (!optimizeDom) {
      return null;
    }

    const handleBgClick = (offsetX: number, offsetY: number, rightClick: boolean) => {
      const x = Math.floor(offsetX / tileSize);
      const y = Math.floor(offsetY / tileSize);

      onCellClick && onCellClick(x, y, rightClick);
    };

    const onBgClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rightClick = e.type === 'contextmenu';

      handleBgClick(e.nativeEvent.offsetX, e.nativeEvent.offsetY, rightClick);
    };

    const onBgTouch = (e: React.TouchEvent<HTMLDivElement>) => {
      if (!e.currentTarget || !e.changedTouches || e.changedTouches.length === 0) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const x = touch.pageX - rect.left;
      const y = touch.pageY - rect.top;

      handleBgClick(x, y, false);
    };

    return (
      <div
        className='absolute'
        onClick={onBgClick}
        onContextMenu={onBgClick}
        onTouchEnd={onBgTouch}
        style={{
          backgroundColor: 'var(--level-grid)',
          backgroundImage: `
          linear-gradient(to right, var(--bg-color) ${borderWidth * 2}px, transparent ${borderWidth * 2}px),
          linear-gradient(to bottom, var(--bg-color) ${borderWidth * 2}px, transparent ${borderWidth * 2}px)
        `,
          backgroundPosition: `${-borderWidth}px ${-borderWidth}px`,
          backgroundSize: `${tileSize}px ${tileSize}px`,
          height: tileSize * height,
          width: tileSize * width,
        }}
      />
    );
  }, [borderWidth, height, onCellClick, optimizeDom, tileSize, width]);

  // Prevent hydration mismatch by not rendering theme class until mounted
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={classNames(
      'grow flex items-center justify-center overflow-hidden',
      mounted ? theme : undefined,
      { [teko.className]: classic }
    )} id={gridId}>
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
            {getBackground()}
            {tiles}
            {Object.values(blocks)}
            {gameState.pos &&
              <Tile
                atEnd={game.isComplete(gameState)}
                className={cellClassName ? cellClassName(gameState.pos.x, gameState.pos.y) : undefined}
                disableAnimation={disableAnimation}
                game={game}
                handleClick={onCellClick ? (rightClick: boolean) => onCellClick(gameState.pos.x, gameState.pos.y, rightClick) : undefined}
                onTopOf={gameState.board[gameState.pos.y][gameState.pos.x].tileType}
                pos={gameState.pos}
                style={cellStyle ? cellStyle(gameState.pos.x, gameState.pos.y) : undefined}
                text={gameState.moves.length}
                theme={theme as Theme}
                tileType={TileType.Player}
              />
            }
          </div>
        </GridContext.Provider>
      }
    </div>
  );
}
