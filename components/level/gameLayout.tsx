import React, { useContext, useEffect, useRef, useState } from 'react';
import Block from './block';
import Control from '../../models/control';
import Controls from './controls';
import Dimensions from '../../constants/dimensions';
import { GameState } from './game';
import Grid from './grid';
import Level from '../../models/db/level';
import Link from 'next/link';
import { PageContext } from '../../contexts/pageContext';
import Player from './player';
import Sidebar from './sidebar';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';

interface GameLayoutProps {
  controls: Control[];
  gameState: GameState;
  level: Level;
}

export default function GameLayout({ controls, gameState, level }: GameLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const { showSidebar, windowSize } = useContext(PageContext);

  const hasSidebar = useHasSidebarOption() && showSidebar;

  useEffect(() => {
    if (ref.current && ref.current.offsetHeight !== 0) {
      setTitleHeight(ref.current.offsetHeight);
    }
  }, [setTitleHeight, windowSize]);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const maxGameHeight = windowSize.height - Dimensions.ControlHeight - (hasSidebar ? 0 : titleHeight);
  const maxGameWidth = windowSize.width - (hasSidebar ? Dimensions.SidebarWidth : 0);
  const squareSize = gameState.width / gameState.height > maxGameWidth / maxGameHeight ?
    Math.floor(maxGameWidth / gameState.width) : Math.floor(maxGameHeight / gameState.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <>
      <div style={{
        display: 'table',
        height: windowSize.height - Dimensions.ControlHeight,
        position: 'absolute',
        width: maxGameWidth,
      }}>
        <div style={{
          display: 'table-cell',
          height: '100%',
          overflow: 'hidden',
          verticalAlign: 'middle',
          width: '100%',
        }}>
          {hasSidebar ? null :
            <div
              className='flex flex-row items-center justify-center p-1'
              ref={ref}
            >
              <h1>{level.name} by <Link href={'/profile/' + level.userId._id.toString()}><a className='underline'>{level.userId.name}</a></Link></h1>
            </div>
          }
          {!hasSidebar && titleHeight === 0 ? null :
            <div style={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div id='father' style={{ position: 'relative' }}>
                {gameState.blocks.map(block => <Block
                  block={block}
                  borderWidth={squareMargin}
                  key={block.id}
                  size={squareSize}
                />)}
                <Player
                  borderWidth={squareMargin}
                  gameState={gameState}
                  leastMoves={level.leastMoves}
                  size={squareSize}
                />
                <Grid
                  board={gameState.board}
                  borderWidth={squareMargin}
                  gameState={gameState}
                  leastMoves={level.leastMoves}
                  squareSize={squareSize}
                />
              </div>
            </div>
          }
        </div>
      </div>
      <div style={{
        bottom: 0,
        display: 'table',
        height: Dimensions.ControlHeight,
        position: 'absolute',
        width: maxGameWidth,
      }}>
        <Controls controls={controls}/>
      </div>
      {!hasSidebar ? null : <Sidebar/>}
    </>
  );
}
