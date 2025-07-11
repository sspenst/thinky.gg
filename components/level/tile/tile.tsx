import { Game, GameType } from '@root/constants/Games';
import Theme from '@root/constants/theme';
import { AppContext } from '@root/contexts/appContext';
import { GridContext } from '@root/contexts/gridContext';
import Position from '@root/models/position';
import classNames from 'classnames';
import React, { useContext, useMemo, useState } from 'react';
import TileType from '../../../constants/tileType';
import Block from './block';
import Player from './player';
import Square from './square';

interface TileProps {
  atEnd?: boolean;
  className?: string | undefined;
  disableAnimation?: boolean;
  game: Game;
  handleClick?: (rightClick: boolean) => void;
  handleMouseDown?: (rightClick: boolean) => void;
  hideText?: boolean;
  inHole?: boolean;
  onTopOf?: TileType;
  pos: Position;
  style?: React.CSSProperties;
  text?: number | undefined;
  theme: Theme;
  tileType: TileType;
  visited?: boolean;
}

const Tile = React.memo(function Tile({
  atEnd,
  className,
  disableAnimation,
  game,
  handleClick,
  handleMouseDown,
  inHole,
  onTopOf,
  pos,
  style,
  text,
  theme,
  tileType,
  visited,
}: TileProps) {
  const { borderWidth, hideText, innerTileSize, tileSize } = useContext(GridContext);

  // initialize the block at the starting position to avoid an animation from the top left
  const [initPos] = useState(new Position(pos.x, pos.y));

  const classic = theme === Theme.Classic;

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (handleMouseDown) {
      handleMouseDown(e.type === 'contextmenu');
    }
  }

  function onTouchStart(_: React.TouchEvent<HTMLDivElement>) {
    if (handleMouseDown) {
      handleMouseDown(false);
    }
  }

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (handleClick) {
      handleClick(e.type === 'contextmenu');
    }

    e.preventDefault();
    e.stopPropagation();
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (handleClick) {
      handleClick(false);
    }

    e.preventDefault();
  }

  const tile = useMemo(() => {
    if (tileType === TileType.Player) {
      return (
        <Player
          atEnd={atEnd}
          game={game}
          moveCount={text ?? 0}
          onTopOf={onTopOf}
          theme={theme}
        />
      );
    }

    if (tileType === TileType.Default ||
      tileType === TileType.Wall ||
      tileType === TileType.Exit ||
      tileType === TileType.Hole
    ) {
      return (
        <Square
          game={game}
          text={hideText || game.type === GameType.COMPLETE_AND_SHORTEST && tileType === TileType.Exit ? undefined : text}
          theme={theme}
          tileType={tileType}
          visited={visited}
        />
      );
    }

    return (
      <Block
        inHole={inHole ?? false}
        onTopOf={onTopOf}
        tileType={tileType}
        game={game}
        theme={theme}
      />
    );
  }, [atEnd, game, hideText, inHole, onTopOf, text, theme, tileType, visited]);
  const { deviceInfo } = useContext(AppContext);

  return (
    <div
      className={classNames(`absolute tile-${game.id} tile-type-${tileType}`, className)}
      onClick={onClick}
      onContextMenu={onClick}
      onMouseDown={!deviceInfo.isMobile ? onMouseDown : undefined}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        backgroundColor: tileType === TileType.Player ? 'var(--bg-color)' : undefined,
        height: classic ? tileSize : innerTileSize,
        left: tileSize * initPos.x + (classic ? 0 : borderWidth),
        top: tileSize * initPos.y + (classic ? 0 : borderWidth),
        transform: `translate(${(pos.x - initPos.x) * tileSize}px, ${(pos.y - initPos.y) * tileSize}px)`,
        transition: !disableAnimation ? 'transform 0.1s' : undefined,
        width: classic ? tileSize : innerTileSize,
        ...style,
      }}
    >
      {tile}
    </div>
  );
});

export default Tile;
