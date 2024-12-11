import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '@root/helpers/gameStateHelpers';
import classNames from 'classnames';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCcwDot } from 'lucide-react';

interface ScrubberProps {
  gameState: GameState;
  onScrub: (moveIndex: number) => void;
  isPro: boolean;
}

export default function Scrubber({ gameState, onScrub, isPro }: ScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const totalMoves = gameState.moves.length + gameState.redoStack.length;
  const currentMove = gameState.moves.length;
  
  // Calculate progress percentage
  const progress = totalMoves === 0 ? 0 : (currentMove / totalMoves) * 100;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isPro) {
      toast.dismiss();
      toast.error(
        <div>Upgrade to <Link href='/pro' className='text-blue-500'>Pro</Link> to use the scrubber!</div>,
        {
          duration: 3000,
          icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
        }
      );
      return;
    }
    setIsDragging(true);
    // Jump to position immediately on click
    const moveIndex = calculateMoveFromPosition(e.clientX);
    if (moveIndex !== undefined) {
      onScrub(moveIndex);
    }
  }, [isPro]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!isPro) {
      toast.dismiss();
      toast.error(
        <div>Upgrade to <Link href='/pro' className='text-blue-500'>Thinky Pro</Link> to use the scrubber!</div>,
        {
          duration: 3000,
          icon: <Image alt='pro' src='/pro.svg' width='16' height='16' />,
        }
      );
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
  }, [isPro]);

  const calculateMoveFromPosition = useCallback((clientX: number) => {
    if (!scrubberRef.current) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const moveIndex = Math.round(position * totalMoves);
    
    // Clamp value between 0 and total moves
    return Math.max(0, Math.min(moveIndex, totalMoves));
  }, [totalMoves]);

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

  return (
    <div 
      className={classNames(
        "w-full bg-color-2 rounded-lg p-2",
        { "cursor-not-allowed opacity-50": !isPro }
      )}
      ref={scrubberRef}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span>Move {currentMove}</span>
          <span>Total {totalMoves}</span>
        </div>
        <div 
          className="h-4 bg-color-3 rounded-full cursor-pointer relative"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Faded circles for all possible positions */}
          {Array.from({ length: totalMoves + 1 }).map((_, i) => (
            <div 
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500/30 rounded-full"
              style={{ 
                left: `${(i / totalMoves) * 100}%`,
                transform: i === 0 ? 'translateY(-50%)' : 
                          i === totalMoves ? 'translate(-100%, -50%)' :
                          'translate(-50%, -50%)'
              }}
            />
          ))}
          {gameState.redoStack.length > 0 && (
            <div 
              className="absolute h-full bg-blue-500/30 rounded-full"
              style={{ 
                width: `${((currentMove + gameState.redoStack.length) / totalMoves) * 100}%`,
              }}
            />
          )}
          <div 
            className={classNames(
              "h-full bg-blue-500 rounded-full relative",
              { "transition-all duration-100": !isDragging }
            )}
            style={{ width: `${progress}%` }}
          >
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full transform translate-x-1/2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
