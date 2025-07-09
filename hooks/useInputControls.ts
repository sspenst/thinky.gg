import { Types } from 'mongoose';
import { useCallback, useRef } from 'react';
import useKeyboardControls from './useKeyboardControls';
import useTouchControls from './useTouchControls';

interface UseInputControlsProps {
  levelId: Types.ObjectId;
  levelWidth: number;
  levelHeight: number;
  onKeyDown: (code: string) => void;
  preventKeyDownEvent?: boolean;
}

interface UseInputControlsReturn {
  shiftKeyDown: React.MutableRefObject<boolean>;
  isSwiping: React.MutableRefObject<boolean>;
  resetTouchState: () => void;
}

export default function useInputControls({
  levelId,
  levelWidth,
  levelHeight,
  onKeyDown,
  preventKeyDownEvent = false,
}: UseInputControlsProps): UseInputControlsReturn {
  // Create ref for shift key state
  const shiftKeyDown = useRef(false);

  // Handle touch-to-keyboard mapping
  const handleTouchMove = useCallback((dx: number, dy: number) => {
    const code = Math.abs(dx) > Math.abs(dy) ?
      (dx < 0 ? 'ArrowLeft' : 'ArrowRight') :
      (dy < 0 ? 'ArrowUp' : 'ArrowDown');

    onKeyDown(code);
  }, [onKeyDown]);

  // Keyboard controls
  useKeyboardControls({
    onKeyDown,
    preventKeyDownEvent,
    shiftKeyDown,
  });

  // Touch controls
  const { isSwiping, resetTouchState } = useTouchControls({
    levelId,
    levelWidth,
    levelHeight,
    onMove: handleTouchMove,
    preventKeyDownEvent,
  });

  return {
    shiftKeyDown,
    isSwiping,
    resetTouchState,
  };
}
