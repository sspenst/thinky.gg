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
  consumeDoubleTapToMoveIntent: () => boolean;
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
  const tapToMoveIntent = useRef<boolean>(false);
  const lastTapTimestamp = useRef<number>(0);
  const lastTapX = useRef<number>(0);
  const lastTapY = useRef<number>(0);
  const longPressActive = useRef<boolean>(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeHandled = useRef<boolean>(false);

  const LONG_PRESS_MS = 250;
  const DOUBLE_TAP_MAX_MS = 350;
  const SWIPE_MAX_MS = 260;
  const SWIPE_SUPPRESS_MS = 300;

  const clearDoubleTapState = useCallback(() => {
    lastTapTimestamp.current = 0;
    lastTapX.current = 0;
    lastTapY.current = 0;
  }, []);

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
      tapToMoveIntent.current = false;
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

    if (!swipeHandled.current && touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
      const dxFromStart: number = clientX - touchXDown.current;
      const dyFromStart: number = clientY - touchYDown.current;
      const distanceFromStart = Math.sqrt(dxFromStart * dxFromStart + dyFromStart * dyFromStart);

      if (!longPressActive.current && distanceFromStart > tapSlop) {
        clearLongPressTimer();
        tapToMoveIntent.current = false;
      }

      if (!longPressActive.current && timeSince <= SWIPE_MAX_MS && distanceFromStart >= swipeDistance) {
        // Fast swipe: move immediately and suppress tap/click.
        swipeHandled.current = true;
        isSwiping.current = true;
        tapToMoveIntent.current = false;
        clearDoubleTapState();
        moveByDXDY(dxFromStart, dyFromStart);
        lastTouchX.current = clientX;
        lastTouchY.current = clientY;
        scheduleSwipeReset();

        return;
      }

      if (!longPressActive.current) {
        return;
      }
    }

    if (longPressActive.current && touchXDown !== undefined && touchYDown !== undefined) {
      const { clientX, clientY } = event.changedTouches[0];
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
  }, [clearDoubleTapState, clearLongPressTimer, getTileMetrics, moveByDXDY, preventKeyDownEvent, scheduleSwipeReset]);

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
      const isTapLike = dragDistance <= tapSlop;

      if (longPressActive.current) {
        // Suppress tap after a long press interaction.
        isSwiping.current = true;
        scheduleSwipeReset();
        tapToMoveIntent.current = false;
        clearDoubleTapState();
        validTouchStart.current = false;
        longPressActive.current = false;

        return;
      }

      if (isTapLike) {
        const timeSinceLastTap = touchStartTimestamp.current - lastTapTimestamp.current;
        const dxFromLastTap = clientX - lastTapX.current;
        const dyFromLastTap = clientY - lastTapY.current;
        const distanceFromLastTap = Math.sqrt(dxFromLastTap * dxFromLastTap + dyFromLastTap * dyFromLastTap);
        const isDoubleTap = lastTapTimestamp.current > 0 &&
          timeSinceLastTap <= DOUBLE_TAP_MAX_MS &&
          distanceFromLastTap <= tapSlop;

        if (isDoubleTap) {
          tapToMoveIntent.current = true;
          clearDoubleTapState();
        } else {
          tapToMoveIntent.current = false;
          lastTapTimestamp.current = touchStartTimestamp.current;
          lastTapX.current = clientX;
          lastTapY.current = clientY;
        }

        validTouchStart.current = false;

        return;
      }

      if (!swipeHandled.current && timeSince <= SWIPE_MAX_MS && dragDistance >= swipeDistance) {
        // For swipe control instead of drag
        isSwiping.current = true;
        tapToMoveIntent.current = false;
        clearDoubleTapState();
        moveByDXDY(dx, dy);
        scheduleSwipeReset();
      } else if (dragDistance > tapSlop) {
        // Movement occurred; suppress synthetic click even if no move happened.
        isSwiping.current = true;
        tapToMoveIntent.current = false;
        clearDoubleTapState();
        scheduleSwipeReset();
      }
    }

    // Reset touch state
    validTouchStart.current = false;
    longPressActive.current = false;
  }, [clearDoubleTapState, clearLongPressTimer, getTileMetrics, moveByDXDY, preventKeyDownEvent, scheduleSwipeReset]);

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
      tapToMoveIntent.current = false;
      clearDoubleTapState();
      longPressActive.current = false;
      touchXDown.current = 0;
      touchYDown.current = 0;
      lastTouchX.current = 0;
      lastTouchY.current = 0;
      clearLongPressTimer();
    };
  }, [clearDoubleTapState, clearLongPressTimer]);

  const consumeDoubleTapToMoveIntent = useCallback(() => {
    const shouldMove = tapToMoveIntent.current;

    tapToMoveIntent.current = false;

    return shouldMove;
  }, []);

  const resetTouchState = useCallback(() => {
    validTouchStart.current = false;
    tapToMoveIntent.current = false;
    clearDoubleTapState();
    clearLongPressTimer();
  }, [clearDoubleTapState, clearLongPressTimer]);

  return {
    consumeDoubleTapToMoveIntent,
    isSwiping,
    resetTouchState,
  };
}
