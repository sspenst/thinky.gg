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
  const lastTouchX = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const validTouchStart = useRef<boolean>(false);
  const touchStartTimestamp = useRef<number>(Date.now());
  const lastMoveTimestamp = useRef(Date.now());
  const isSwiping = useRef<boolean>(false);
  const longPressActive = useRef<boolean>(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeHandled = useRef<boolean>(false);

  const LONG_PRESS_MS = 250;
  const TAP_MAX_MS = 220;
  const SWIPE_MAX_MS = 260;
  const SWIPE_SUPPRESS_MS = 300;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const scheduleSwipeReset = useCallback(() => {
    setTimeout(() => {
      isSwiping.current = false;
    }, SWIPE_SUPPRESS_MS);
  }, []);

  const getTileMetrics = useCallback(() => {
    const containerDiv = document.getElementById(`grid-${levelId.toString()}`);
    const maxHeight = containerDiv?.offsetHeight || 0;
    const maxWidth = containerDiv?.offsetWidth || 0;
    const baseTileSize = levelWidth / levelHeight > maxWidth / maxHeight ?
      Math.floor(maxWidth / levelWidth) : Math.floor(maxHeight / levelHeight);
    const tileSize = Math.max(1, baseTileSize || 0);
    const tileMargin = Math.round(tileSize / 40) || 1;
    const tapSlop = Math.max(8, Math.round(tileSize * 0.12));
    const swipeDistance = Math.max(12, Math.round(tileSize * 0.35));

    return {
      tapSlop,
      swipeDistance,
      tileMargin,
      tileSize,
    };
  }, [levelHeight, levelId, levelWidth]);

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
      lastTouchX.current = touchXDown.current;
      lastTouchY.current = touchYDown.current;
      swipeHandled.current = false;
      isSwiping.current = false;
      longPressActive.current = false;
      touchStartTimestamp.current = Date.now();
      clearLongPressTimer();
      longPressTimer.current = setTimeout(() => {
        if (!swipeHandled.current && validTouchStart.current) {
          longPressActive.current = true;
        }
      }, LONG_PRESS_MS);
    }
  }, [clearLongPressTimer, levelId, preventKeyDownEvent]);

  const handleTouchMoveEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - touchStartTimestamp.current;
    const { tapSlop, swipeDistance, tileMargin, tileSize } = getTileMetrics();

    if (!isSwiping.current && !swipeHandled.current && touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dxFromStart: number = clientX - touchXDown.current;
      const dyFromStart: number = clientY - touchYDown.current;
      const distanceFromStart = Math.sqrt(dxFromStart * dxFromStart + dyFromStart * dyFromStart);

      if (!longPressActive.current && distanceFromStart > tapSlop) {
        clearLongPressTimer();
      }

      if (!longPressActive.current && timeSince <= SWIPE_MAX_MS && distanceFromStart >= swipeDistance) {
        // Fast swipe: move immediately and suppress tap/click.
        swipeHandled.current = true;
        isSwiping.current = true;
        moveByDXDY(dxFromStart, dyFromStart);
        lastTouchX.current = clientX;
        lastTouchY.current = clientY;
        scheduleSwipeReset();
        return;
      }

      if (!longPressActive.current) {
        return;
      }

      const dx: number = clientX - lastTouchX.current;
      const dy: number = clientY - lastTouchY.current;

      if (Math.abs(dx) < tileSize - tileMargin && Math.abs(dy) < tileSize - tileMargin) {
        return;
      }

      if (timeSince > 0) {
        lastTouchX.current = clientX;
        lastTouchY.current = clientY;
        moveByDXDY(dx, dy);
      }
    }
  }, [clearLongPressTimer, getTileMetrics, moveByDXDY, preventKeyDownEvent, scheduleSwipeReset]);

  const handleTouchEndEvent = useCallback((event: TouchEvent) => {
    if (!validTouchStart.current || preventKeyDownEvent) {
      return;
    }

    const timeSince = Date.now() - touchStartTimestamp.current;
    const { tapSlop, swipeDistance } = getTileMetrics();
    clearLongPressTimer();

    if (touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dx: number = clientX - touchXDown.current;
      const dy: number = clientY - touchYDown.current;
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (longPressActive.current) {
        // Suppress tap after a long press.
        isSwiping.current = true;
        scheduleSwipeReset();
        validTouchStart.current = false;
        longPressActive.current = false;
        return;
      }

      if (dragDistance <= tapSlop && timeSince <= TAP_MAX_MS) {
        // Reset touch state on tap
        validTouchStart.current = false;
        return;
      }

      if (!swipeHandled.current && timeSince <= SWIPE_MAX_MS && dragDistance >= swipeDistance) {
        // For swipe control instead of drag
        isSwiping.current = true;
        moveByDXDY(dx, dy);
        scheduleSwipeReset();
      } else if (dragDistance > tapSlop) {
        // Movement occurred; suppress synthetic click even if no move happened.
        isSwiping.current = true;
        scheduleSwipeReset();
      }
    }

    // Reset touch state
    validTouchStart.current = false;
    longPressActive.current = false;
  }, [clearLongPressTimer, getTileMetrics, moveByDXDY, preventKeyDownEvent, scheduleSwipeReset]);

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
      longPressActive.current = false;
      touchXDown.current = 0;
      touchYDown.current = 0;
      lastTouchX.current = 0;
      lastTouchY.current = 0;
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const resetTouchState = useCallback(() => {
    validTouchStart.current = false;
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  return {
    isSwiping,
    resetTouchState,
  };
}
