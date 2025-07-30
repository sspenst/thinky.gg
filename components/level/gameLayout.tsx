import { AppContext } from '@root/contexts/appContext';
import { PageContext } from '@root/contexts/pageContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import { LucideMoveLeft, LucideMoveRight } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import Control from '../../models/control';
import { EnrichedLevel } from '../../models/db/level';
import FormattedLevelLink from '../formatted/formattedLevelLink';
import CheckpointsModal from '../modal/checkpointsModal';
import StyledTooltip from '../page/styledTooltip';
import Controls from './controls';
import Grid from './grid';
import Scrubber from './scrubber';

interface GameLayoutProps {
  controls: Control[];
  disableCheckpoints?: boolean;
  gameState: GameState;
  level: EnrichedLevel;
  onCellClick: (x: number, y: number) => void;
  onScrub?: (moveIndex: number) => void;
  isPro: boolean;
  nextLevel?: EnrichedLevel;
  prevLevel?: EnrichedLevel;
  isCollectionViewHidden?: boolean;
  hasCollection?: boolean;
}

export default function GameLayout({ controls, disableCheckpoints, gameState, level, onCellClick, onScrub, isPro, nextLevel, prevLevel, isCollectionViewHidden, hasCollection }: GameLayoutProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const [isCheckpointOpen, setIsCheckpointOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const { setPreventKeyDownEvent, setShowHeader } = useContext(PageContext);
  const { deviceInfo } = useContext(AppContext);

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
    function handleOrientationChange() {
      setIsLandscape(window.innerWidth > window.innerHeight);
    }

    handleOrientationChange(); // Check initial orientation
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    setShowHeader(!fullScreen);
  }, [fullScreen, setShowHeader]);

  return (
    <div className='grow flex flex-col max-w-full select-none h-full ph-no-capture' id='game-layout' style={{
      backgroundColor: 'var(--bg-color)',
    }}>
      {/* Navigation buttons */}
      <div className={`mx-4 ${deviceInfo.isMobile && isLandscape ? 'my-0.5' : 'm-1'}`}>

        <div className='flex justify-between items-center'>
          {controls.find(c => c.id === 'btn-prev') && (
            <button
              className='flex items-center hover:bg-color-2 rounded-lg transition-colors duration-200 '
              onClick={() => controls.find(c => c.id === 'btn-prev')?.action()}
            >
              <LucideMoveLeft className='mr-2' />
              <span className='max-w-32 md:max-w-60 flex flex-col items-start'>
                <span>{prevLevel ? <><u>P</u>rev Level</> : 'Back'}</span>
                {prevLevel && (
                  <span className='hidden md:inline'>
                    <FormattedLevelLink id='prev' level={prevLevel} />
                  </span>
                )}
              </span>
            </button>
          )}
          {controls.find(c => c.id === 'btn-next') && (
            <button
              className='flex items-center  hover:bg-color-2 rounded-lg transition-colors duration-200'
              onClick={() => controls.find(c => c.id === 'btn-next')?.action()}
            >
              <span className='max-w-32 md:max-w-60 flex flex-col items-end'>
                <span><u>N</u>ext Level</span>
                {nextLevel && (
                  <span className='hidden md:inline'>
                    <FormattedLevelLink id='next' level={nextLevel} />
                  </span>
                )}
              </span>
              <LucideMoveRight className='ml-2' />
            </button>
          )}
        </div>
      </div>
      {/* Mobile landscape scrubber at top */}
      {deviceInfo.isMobile && isLandscape && onScrub && (
        <div className='bg-color border-b border-color-3 px-2 pb-2'>
          <Scrubber
            gameState={gameState}
            onScrub={onScrub}
            isPro={isPro}
          />
        </div>
      )}
      <div className={`flex grow relative ${deviceInfo.isMobile && isLandscape ? 'mb-16' : 'mb-32'}`}>
        <Grid
          gameState={gameState}
          id={level._id.toString()}
          leastMoves={level.leastMoves}
          onCellClick={(x, y, rightClick, isDragging) => {
            if (!rightClick && !isDragging) {
              onCellClick(x, y);
            }
          }}
          optimizeDom
        />
      </div>
      
      {/* Bottom controls */}
      <div
        className='fixed bottom-0 left-0 right-0 bg-color z-40 border-t border-color-3'
        style={{
          right: deviceInfo.screenSize >= ScreenSize.XL ? // xl breakpoint
            (hasCollection && !isCollectionViewHidden ? '640px' : '400px') : // collection (240px) + info (400px) OR just info (400px)
            '0px' // mobile/tablet: full width
        }}
      >
        <div className='gap-2 mx-3 py-2 transition-opacity flex flex-col'>
          {onScrub && !(deviceInfo.isMobile && isLandscape) && <div className='mb-2'><Scrubber
            gameState={gameState}
            onScrub={onScrub}
            isPro={isPro}
          /></div>}
          <div className='gap-2 flex'>
            {!disableCheckpoints && !fullScreen &&
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
            }
            <div className='grow'>
              <Controls controls={controls.filter(c => c.id !== 'btn-prev' && c.id !== 'btn-next')} />
            </div>
            {!deviceInfo.isMobile &&
              <>
                <button
                  data-tooltip-content='Fullscreen'
                  data-tooltip-id='fullscreen-tooltip'
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
                <StyledTooltip id='fullscreen-tooltip' />
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
