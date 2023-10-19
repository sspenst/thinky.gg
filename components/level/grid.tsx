import TileType from '@root/constants/tileType';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import { rubik, teko } from '../../pages/_app';
import Tile from './tile/tile';

interface GridProps {
  cellClassName?: (x: number, y: number) => string | undefined;
  gameState: GameState;
  id: string;
  leastMoves: number;
  onCellClick?: (x: number, y: number, rightClick: boolean) => void;
}

export default function Grid({ cellClassName, gameState, id, leastMoves, onCellClick }: GridProps) {
  const { theme } = useContext(AppContext);
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

  const tiles: any = [];
  const blocks: { [id: number]: JSX.Element } = {};

  for (let y = 0; y < gameState.board.length; y++) {
    for (let x = 0; x < gameState.board[y].length; x++) {
      const tileState = gameState.board[y][x];
      const tileType = tileState.tileType;
      const text = tileType === TileType.Start ? 0 :
        tileType === TileType.End ? leastMoves :
          tileState.text.length === 0 ? undefined :
            tileState.text[tileState.text.length - 1];

      if (tileType !== TileType.Default) {
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
      }

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

  useEffect(() => {
    const drawGrid = () => {
      const canvas = document.getElementById('gridcanvas') as HTMLCanvasElement;

      if (!canvas) return;

      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set the canvas dimensions

      /** the following code helps me the canvas not be blurry
       * https://stackoverflow.com/questions/8696631/canvas-drawings-like-lines-are-blurry
       */
      canvas.style.width = tileSize * width + 'px';
      canvas.style.height = tileSize * height + 'px';

      // Set actual size in memory (scaled to account for extra pixel density).
      const scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.

      canvas.width = tileSize * width * scale;
      canvas.height = tileSize * height * scale;

      // Normalize coordinate system to use css pixels.
      ctx.scale(scale, scale);
      //
      const style = getComputedStyle(document.body);
      // Todo: access the color from another div we want to match

      const colorLevelGrid = style.getPropertyValue('--level-grid').trim();

      // const colorGridText = style.getPropertyValue('--level-grid-text').trim(); // this seems to be used for player number
      // const innerBorderWidth = Math.round(innerTileSize / 4.5); // seems to be used only for blocks
      const colorBlockBorder = style.getPropertyValue('--bg-color').trim();
      const colorLevelGridUsed = style.getPropertyValue('--level-grid-used').trim();
      const colorLevelPlayerExtra = style.getPropertyValue('--level-player-extra').trim();
      const colorLevelGridText = style.getPropertyValue('--level-grid-text').trim();
      const classic = theme === Theme.Classic;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const shadowOffsetX = borderWidth;
      const shadowOffsetY = borderWidth;
      const shadowBlur = borderWidth;
      const shadowColor = colorBlockBorder;

      const adjust = classic ? 1 : 0;

      // Draw grid squares
      for (let y = 0; y < gameState.board.length; y++) {
        for (let x = 0; x < gameState.board[y].length; x++) {
          const tileState = gameState.board[y][x];
          const tileType = tileState.tileType;
          const text = tileType === TileType.Start ? 0 :
            tileType === TileType.End ? leastMoves :
              tileState.text.length === 0 ? undefined :
                tileState.text[tileState.text.length - 1];

          ctx.fillStyle = colorLevelGrid;
          const fontSizeRatio = text === undefined || String(text).length <= 3 ?
            2 : (1 + (String(text).length - 1) / 2);
          const fontSize = innerTileSize / fontSizeRatio * (classic ? 1.5 : 1);
          const overStepped = text !== undefined && leastMoves !== 0 && text > leastMoves;
          const textColor = overStepped ?
            colorLevelGridUsed : colorLevelGridText;

          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = !classic ? shadowBlur : 0;
          ctx.shadowOffsetX = !classic ? shadowOffsetX : 0;
          ctx.shadowOffsetY = !classic ? shadowOffsetY : 0;

          ctx.font = fontSize + 'px ' + (!classic ? rubik.style.fontFamily : teko.style.fontFamily);
          ctx.fillStyle = text === undefined ? colorLevelGrid : colorLevelGridUsed; // Set text color
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

          ctx.fillStyle = textColor; // Set text color
          // disable shadow
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowColor = 'transparent';

          if (text !== undefined) {
            // Todo: the y position seems a bit off...
            ctx.fillText(text.toString(), (x + 0.5) * tileSize, (y + 0.5) * tileSize);
          }
        }
      }

      ctx.lineWidth = borderWidth * 2;
      ctx.strokeStyle = colorBlockBorder;

      // now draw the grid lines

      for (let i = 0; i <= width; i++) {
        ctx.beginPath();

        ctx.moveTo(i * tileSize - adjust, 0);
        ctx.lineTo(i * tileSize - adjust, height * tileSize);
        ctx.stroke();
      }

      for (let i = 0; i <= height; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * tileSize + adjust);
        ctx.lineTo(width * tileSize, i * tileSize + adjust);
        ctx.stroke();
      }
    };

    drawGrid();
  }, [tileSize, width, height, gameState.board, leastMoves, theme, innerTileSize, borderWidth]);

  return (
    <div className={classNames('grow flex items-center justify-center overflow-hidden', { [teko.className]: classic })} id={gridId}>
      {tileSize !== 0 &&
        <GridContext.Provider value={{
          borderWidth: borderWidth,
          innerTileSize: innerTileSize,
          leastMoves: leastMoves,
          tileSize: tileSize,
        }}>
          <canvas id='gridcanvas' />

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
                atEnd={gameState.board[gameState.pos.y][gameState.pos.x].tileType === TileType.End}
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
