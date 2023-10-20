import { AppContext } from '@root/contexts/appContext';
import { GameContext } from '@root/contexts/gameContext';
import { PageContext } from '@root/contexts/pageContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import isPro from '@root/helpers/isPro';
import useCheckpoints from '@root/hooks/useCheckpoints';
import useDeviceCheck, { ScreenSize } from '@root/hooks/useDeviceCheck';
import Image from 'next/image';
import React, { useContext, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import Control from '../../models/control';
import { EnrichedLevel } from '../../models/db/level';
import FormattedUser from '../formatted/formattedUser';
import CheckpointsModal from '../modal/checkpointsModal';
import LevelInfoModal from '../modal/levelInfoModal';
import StyledTooltip from '../page/styledTooltip';
import Controls from './controls';
import Game from './game';
import Solved from './info/solved';

interface GameLayoutProps {
  allowFreeUndo?: boolean;
  disableCheckpoints?: boolean;
  disablePlayAttempts?: boolean;
  disableStats?: boolean;
  enableSessionCheckpoint?: boolean;
  extraControls?: Control[];
  level: EnrichedLevel;
  matchId?: string;
  onMove?: (gameState: GameState) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onSolve?: () => void;
  onStatsSuccess?: () => void;
}

export default function GameLayout({
  allowFreeUndo,
  disableCheckpoints,
  disablePlayAttempts,
  disableStats,
  enableSessionCheckpoint,
  extraControls,
  level,
  matchId,
  onMove,
  onNext,
  onPrev,
  onSolve,
  onStatsSuccess,
}: GameLayoutProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const [isCheckpointOpen, setIsCheckpointOpen] = useState(false);
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
  const { setPreventKeyDownEvent, setShowHeader } = useContext(PageContext);
  const { user } = useContext(AppContext);
  const pro = isPro(user);
  const { checkpoints, mutateCheckpoints } = useCheckpoints(level._id, disableCheckpoints || !user || !pro);

  useEffect(() => {
    function handleFullScreenChange() {
      setFullScreen(!!document.fullscreenElement);
    }

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    setShowHeader(!fullScreen);
  }, [fullScreen, setShowHeader]);

  const [controls, setControls] = useState<Control[]>([]);
  const { screenSize } = useDeviceCheck();
  const isMobile = screenSize < ScreenSize.XL;

  useEffect(() => {
    const _controls: Control[] = [];

    if (onPrev) {
      const leftArrow = <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
      </svg>;
      const prevTxt = isMobile ? leftArrow : <div><span className='underline'>P</span>rev Level</div>;

      _controls.push(new Control('btn-prev', () => onPrev(), prevTxt ));
    }

    const restartIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99' />
    </svg>);
    const restartTxt = isMobile ? restartIcon : <div><span className='underline'>R</span>estart</div>;

    const undoIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3' />
    </svg>);
    const undoTxt = isMobile ? undoIcon : <div><span className='underline'>U</span>ndo</div>;

    const redoIcon = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
      <path strokeLinecap='round' strokeLinejoin='round' d='M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3' />
    </svg>);

    const redoTxt = isMobile ? redoIcon : <div>Redo (<span className='underline'>Y</span>)</div>;

    _controls.push(
      new Control('btn-restart', () => document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'KeyR' })), restartTxt),
      new Control('btn-undo', () => document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Backspace' })), undoTxt, false, false, () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'Backspace' }));

        return true;
      }),
      new Control(
        'btn-redo',
        () => document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'KeyY' })),
        <span className='flex gap-2 justify-center select-none'>
          {!pro && <Image className='pointer-events-none z-0' alt='pro' src='/pro.svg' width='16' height='16' />}
          {redoTxt}
        </span>,
        false,
        false,
        () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'KeyY' }));

          return true;
        },
      ),
    );

    if (onNext) {
      const rightArrow = <span className='truncate'><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' />
      </svg></span>;
      const nextTxt = isMobile ? rightArrow : <div><span className='underline'>N</span>ext Level</div>;

      _controls.push(new Control('btn-next', () => onNext(), nextTxt));
    }

    if (extraControls) {
      setControls(_controls.concat(extraControls));
    } else {
      setControls(_controls);
    }
  }, [extraControls, isMobile, onNext, onPrev, pro, setControls]);

  return (
    <GameContext.Provider value={{
      checkpoints: checkpoints,
      level: level,
      mutateCheckpoints: mutateCheckpoints,
    }}>
      <div className='grow flex flex-col max-w-full select-none h-full' id='game-layout' style={{
        backgroundColor: 'var(--bg-color)',
      }}>
        {!matchId && level.userId && !fullScreen && <>
          <div className='flex items-center justify-center py-1 px-2 gap-1 block xl:hidden'>
            <button
              className='flex gap-2 items-center truncate'
              onClick={() => {
                setIsLevelInfoOpen(true);
                setPreventKeyDownEvent(true);
              }}
              style={{
                color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)',
              }}
            >
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' width='16' height='16' style={{
                minWidth: 16,
                minHeight: 16,
              }}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' />
              </svg>
              <h1
                className='whitespace-nowrap font-bold underline truncate'
              >
                {level.name}
              </h1>
              {level.userMoves === level.leastMoves && <Solved className='-ml-2' />}
            </button>
            by
            <div style={{ minWidth: 100 }}>
              <FormattedUser id='level-title' size={Dimensions.AvatarSizeSmall} user={level.userId} />
            </div>
          </div>
          <LevelInfoModal
            closeModal={() => {
              setIsLevelInfoOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isLevelInfoOpen}
            level={level}
          />
        </>}
        <Game
          allowFreeUndo={allowFreeUndo}
          disableCheckpoints={disableCheckpoints}
          disablePlayAttempts={disablePlayAttempts}
          disableStats={disableStats}
          enableSessionCheckpoint={enableSessionCheckpoint}
          level={level}
          matchId={matchId}
          onMove={onMove}
          onNext={onNext}
          onPrev={onPrev}
          onSolve={onSolve}
          onStatsSuccess={onStatsSuccess}
        />
        <div className='gap-2 mx-3 z-20 transition-opacity flex'>
          {!disableCheckpoints && !fullScreen ?
            <>
              <button
                data-tooltip-content='Checkpoints'
                data-tooltip-id='checkpoint-tooltip'
                id='checkpointBtn'
                onClick={() => {
                  setIsCheckpointOpen(!isCheckpointOpen);
                  setPreventKeyDownEvent(true);
                }}
              >
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
                </svg>
              </button>
              <StyledTooltip id='checkpoint-tooltip' />
              <CheckpointsModal
                closeModal={() => {
                  setIsCheckpointOpen(false);
                  setPreventKeyDownEvent(false);
                }}
                isOpen={isCheckpointOpen}
              />
            </>
            :
            <div className='w-6' />
          }
          <div className='grow'>
            <Controls controls={controls} />
          </div>
          <button
            id='fullscreenBtn'
            onClick={() => {
              const el = document.getElementById('game-layout');
              const supportsFullScreen = el && !!el.requestFullscreen;

              // NB: some devices (eg iPhone) do not support full screen mode
              // in this case, just hide as much of the UX as possible
              if (!supportsFullScreen) {
                setFullScreen(f => !f);
              } else {
                if (fullScreen) {
                  document.exitFullscreen();
                } else {
                  el.requestFullscreen();
                }
              }
            }}
          >
            {fullScreen ?
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25' />
              </svg>
              :
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15' />
              </svg>
            }
          </button>
        </div>
      </div>
    </GameContext.Provider>
  );
}
