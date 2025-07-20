import { Types } from 'mongoose';
import { useCallback, useEffect, useRef } from 'react';

interface UseTouchControlsProps {
  levelId: Types.ObjectId;
  levelWidth: number;
  levelHeight: number;
  onMove: (dx: number, dy: number) => void;
  preventKeyDownEvent?: boolean;
}

interface UseTouchControlsReturn {
  isSwiping: React.MutableRefObject<boolean>;
  resetTouchState: () => void;
}

export default function useTouchControls({
  levelId,
  levelWidth,
  levelHeight,
  onMove,
  preventKeyDownEvent = false,
}: UseTouchControlsProps): UseTouchControlsReturn {
  const touchXDown = useRef<number>(0);
  const touchYDown = useRef<number>(0);
  const validTouchStart = useRef<boolean>(false);
  const lastTouchTimestamp = useRef<number>(Date.now());
  const lastMoveTimestamp = useRef(Date.now());
  const isSwiping = useRef<boolean>(false);

  const moveByDXDY = useCallback((dx: number, dy: number) => {
    const timeSince = Date.now() - lastMoveTimestamp.current;

    if (timeSince < 0) {
      // max move rate
      return;
    }

    lastMoveTimestamp.current = Date.now();
    onMove(dx, dy);
  }, [onMove]);

  const handleTouchStartEvent = useCallback((event: TouchEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    // NB: must start the touch event within the game layout
    const isValid = event.composedPath().some(e => (e as HTMLElement).id === `grid-${levelId.toString()}`);

    validTouchStart.current = isValid;

    if (isValid) {
      // store the mouse x and y position
      touchXDown.current = event.touches[0].clientX;
      touchYDown.current = event.touches[0].clientY;
      isSwiping.current = false;
      lastTouchTimestamp.current = Date.now();
      event.preventDefault();
    }
  }, [levelId, preventKeyDownEvent]);

  const handleTouchMoveEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince > 500) {
      isSwiping.current = false;
    }

    if (!isSwiping.current && touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;
      const containerDiv = document.getElementById(`grid-${levelId.toString()}`);

      const maxHeight = containerDiv?.offsetHeight || 0;
      const maxWidth = containerDiv?.offsetWidth || 0;
      const tileSize = levelWidth / levelHeight > maxWidth / maxHeight ?
        Math.floor(maxWidth / levelWidth) : Math.floor(maxHeight / levelHeight);

      const tileMargin = Math.round(tileSize / 40) || 1;

      // drag distance
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (dragDistance / timeSince > 0.3) {
        // if the user drags really fast and it was sudden, don't move on drag because it is likely a swipe
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        isSwiping.current = true;

        return;
      }

      if (Math.abs(dx) < tileSize - tileMargin && Math.abs(dy) < tileSize - tileMargin) {
        return;
      }

      if (timeSince > 0) {
        touchXDown.current = clientX;
        touchYDown.current = clientY;
        moveByDXDY(dx, dy);
      }
    }
  }, [levelId, levelHeight, levelWidth, moveByDXDY, preventKeyDownEvent]);

  const handleTouchEndEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - lastTouchTimestamp.current;

    if (timeSince <= 500 && touchXDown !== undefined && touchYDown !== undefined) {
      // for swipe control instead of drag
      const { clientX, clientY } = event.changedTouches[0];

      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;

      if (Math.abs(dx) <= 0.5 && Math.abs(dy) <= 0.5) {
        // Reset touch state on tap
        validTouchStart.current = false;

        return;
      }

      moveByDXDY(dx, dy);
      touchXDown.current = clientX;
      touchYDown.current = clientY;
    }

    // Reset touch state
    validTouchStart.current = false;
    isSwiping.current = false;
  }, [moveByDXDY, preventKeyDownEvent]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStartEvent, { passive: false });
    document.addEventListener('touchmove', handleTouchMoveEvent, { passive: false });
    document.addEventListener('touchend', handleTouchEndEvent, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStartEvent);
      document.removeEventListener('touchmove', handleTouchMoveEvent);
      document.removeEventListener('touchend', handleTouchEndEvent);
    };
  }, [handleTouchMoveEvent, handleTouchStartEvent, handleTouchEndEvent, levelId]);

  useEffect(() => {
    return () => {
      // Reset all touch states on unmount
      validTouchStart.current = false;
      isSwiping.current = false;
      touchXDown.current = 0;
      touchYDown.current = 0;
    };
  }, []);

  const resetTouchState = useCallback(() => {
    validTouchStart.current = false;
  }, []);

  return {
    isSwiping,
    resetTouchState,
  };
}
