import React, { useContext, useEffect, useRef, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { LayoutContext } from '../../contexts/layoutContext';
import { PageContext } from '../../contexts/pageContext';
import useHasSidebarOption from '../../hooks/useHasSidebarOption';
import Control from '../../models/control';
import Level from '../../models/db/level';
import FormattedUser from '../formattedUser';
import Block from './block';
import Controls from './controls';
import { GameState } from './game';
import Grid from './grid';
import Player from './player';
import Sidebar from './sidebar';

interface GameLayoutProps {
  controls: Control[];
  gameState: GameState;
  level: Level;
}

export default function GameLayout({ controls, gameState, level }: GameLayoutProps) {
  const [containerHeight, setContainerHeight] = useState<number>();
  const [containerWidth, setContainerWidth] = useState<number>();
  const [hasSidebar, setHasSidebar] = useState(true);
  const hasSidebarOption = useHasSidebarOption();
  const { layoutHeight } = useContext(LayoutContext);
  const ref = useRef<HTMLDivElement>(null);
  const { showSidebar, windowSize } = useContext(PageContext);
  const [titleHeight, setTitleHeight] = useState(0);

  useEffect(() => {
    setHasSidebar(hasSidebarOption && showSidebar);
  }, [hasSidebarOption, showSidebar]);

  useEffect(() => {
    // NB: GameLayout must exist within a div with id 'layout-container'
    const containerDiv = document.getElementById('layout-container');

    setContainerHeight(containerDiv?.offsetHeight);
    setContainerWidth(containerDiv?.offsetWidth);
  }, [layoutHeight, windowSize.height, windowSize.width]);

  useEffect(() => {
    if (ref.current && ref.current.offsetHeight !== 0) {
      setTitleHeight(ref.current.offsetHeight);
    }
  }, [setTitleHeight, containerWidth, containerHeight, hasSidebar]);

  if (!containerHeight || !containerWidth) {
    return null;
  }

  const maxHeight = containerHeight - Dimensions.ControlHeight - (hasSidebar ? 0 : titleHeight);
  const maxWidth = containerWidth - (hasSidebar ? Dimensions.SidebarWidth : 0);

  // calculate the square size based on the available game space and the level dimensions
  // NB: forcing the square size to be an integer allows the block animations to travel along actual pixels
  const squareSize = gameState.width / gameState.height > maxWidth / maxHeight ?
    Math.floor(maxWidth / gameState.width) : Math.floor(maxHeight / gameState.height);
  const squareMargin = Math.round(squareSize / 40) || 1;

  return (
    <>
      {!hasSidebar ? null : <Sidebar />}
      <div style={{
        display: 'table',
        height: maxHeight,
        width: maxWidth,
      }}>
        <div id='game-layout' style={{
          display: 'table-cell',
          height: '100%',
          overflow: 'hidden',
          verticalAlign: 'middle',
          width: '100%',
        }}>
          {hasSidebar || !level.userId ? null :
            <div
              className='flex flex-row items-center justify-center p-1 gap-1'
              ref={ref}
            >
              <h1>{level.name} by</h1>
              <FormattedUser size={Dimensions.AvatarSizeSmall} user={level.userId} />
            </div>
          }
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
                key={`block-${block.id}`}
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
        </div>
      </div>
      <div style={{
        bottom: 0,
        display: 'table',
        height: Dimensions.ControlHeight,
        width: maxWidth,
      }}>
        <Controls controls={controls} />
      </div>
    </>
  );
}
