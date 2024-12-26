import { AppContext } from '@root/contexts/appContext';
import { GameState } from '@root/helpers/gameStateHelpers';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import classNames from 'classnames';
import { ChevronDown, Spline } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import Modal from '../modal';

interface ScrubberProps {
    gameState: GameState;
    onScrub: (moveIndex: number) => void;
    isPro: boolean;
}

export default function Scrubber({ gameState, onScrub, isPro }: ScrubberProps) {
  const [showProModal, setShowProModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const totalMoves = gameState.moves.length + gameState.redoStack.length;
  const currentMove = gameState.moves.length;
  const { deviceInfo } = useContext(AppContext);
  // Calculate progress percentage
  const progress = totalMoves === 0 ? 0 : (currentMove / totalMoves) * 100;
  const calculateMoveFromPosition = useCallback((clientX: number) => {
    if (!scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const moveIndex = Math.round(position * totalMoves);

    // Clamp value between 0 and total moves
    return Math.max(0, Math.min(moveIndex, totalMoves));
  }, [totalMoves]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    if (!isPro) {
      setShowProModal(true);

      return;
    }

    setIsDragging(true);
    // Jump to position immediately on click
    const moveIndex = calculateMoveFromPosition(e.clientX);

    if (moveIndex !== undefined) {
      onScrub(moveIndex);
    }
  }, [isPro, calculateMoveFromPosition, onScrub]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (!isPro) {
      setShowProModal(true);

      return;
    }

    setIsDragging(true);

    // Jump to position immediately on tap
    if (e.touches.length > 0) {
      const moveIndex = calculateMoveFromPosition(e.touches[0].clientX);

      if (moveIndex !== undefined) {
        onScrub(moveIndex);
      }
    }
  }, [isPro, calculateMoveFromPosition, onScrub]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    const moveIndex = calculateMoveFromPosition(clientX);

    if (moveIndex !== undefined) {
      onScrub(moveIndex);
    }
  }, [isDragging, calculateMoveFromPosition, onScrub]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);
  const dotDisplayThresholdMap = {
    [ScreenSize.XS]: 30,
    [ScreenSize.SM]: 50,
    [ScreenSize.MD]: 100,
    [ScreenSize.LG]: 150,
    [ScreenSize.XL]: 250,
  } as Record<ScreenSize, number>;

  const dotDisplayThreshold = dotDisplayThresholdMap[deviceInfo.screenSize] || 100;
  const interval = Math.max(1, Math.floor(totalMoves / 100) * 10 + (totalMoves < 10 ? 1 : 10));

  return (
    <>
      <div className='w-full flex flex-col'>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='self-center p-2 hover:bg-color-2 rounded-full transition-colors duration-200'
        >
          {!isExpanded ? <div className='flex flex-row text-xs items-center'><span><Spline /></span></div> : <ChevronDown />}
        </button>
        <div className={classNames(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div
            className={classNames(
              'w-full px-6 bg-color-2 rounded-lg p-2',
              { 'cursor-not-allowed opacity-50': !isPro }
            )}
            ref={scrubberRef}
          >
            <div className='flex flex-col gap-2'>
              <div className='flex justify-between text-sm'>
                <span>Move {currentMove}</span>
                <span>Total {totalMoves}</span>
              </div>
              <div
                className='h-4 bg-color-3 rounded-full cursor-pointer relative'
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {/* Faded circles for all possible positions */}

                {gameState.redoStack.length > 0 && (
                  <div
                    className='absolute h-full bg-blue-500/30 rounded-full'
                    style={{
                      width: `${((currentMove + gameState.redoStack.length) / totalMoves) * 100}%`,
                    }}
                  />
                )}
                <div
                  className={classNames(
                    'h-full rounded-full relative transition-all duration-300 ease-in-out',
                    { 'transition-none': isDragging }
                  )}
                  style={{
                    backgroundColor: 'var(--bg-color-3)',
                    width: `${progress}%`
                  }}
                >
                  <div
                    className={classNames(
                      'absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full transform translate-x-1/2',
                      'transition-all duration-300 ease-in-out',
                      { 'transition-none': isDragging }
                    )}
                  />
                </div>
                {Array.from({ length: totalMoves + 1 }).map((_, i) => (
                  <div key={i} className='absolute top-1/2 -translate-y-1/2' style={{ left: `${(i / totalMoves) * 100}%` }}>
                    {i % interval === 0 ? (
                      <div className='z-100 absolute text-xs text-white' style={{ transform: 'translate(-50%, -50%)' }}>
                        {i}
                      </div>
                    ) : (
                      totalMoves < dotDisplayThreshold && <div className='z-0 absolute w-2 h-2 bg-gray-800 rounded-full' style={{ transform: 'translate(-50%, -50%)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        closeModal={() => setShowProModal(false)}
        isOpen={showProModal}
        title='Timeline Scrubber'
      >
        <div className='flex flex-col gap-4 items-center text-lg'>
          <div>
                        With the timeline scrubber, you can <span className='font-bold'>rewind and fast-forward</span>&nbsp;through your moves by simply dragging the scrubber handle, making it easy to analyze and improve your solutions.
          </div>
          <div>
                        By upgrading to <Link href='/pro' className='text-blue-500 hover:text-blue-300 outline-none'>Thinky Pro</Link>, you will gain access to this powerful feature, along with additional benefits designed to enhance your gameplay:
          </div>
          <Link href='/pro' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 m-2 rounded focus:outline-none focus:shadow-outline cursor-pointer'>
                        Upgrade to Pro
          </Link>
        </div>
      </Modal>
    </>
  );
}
