import { useCallback, useEffect, useRef } from 'react';

interface UseGameKeyboardControlsProps {
  onKeyDown: (code: string) => void;
  preventKeyDownEvent?: boolean;
}

interface UseGameKeyboardControlsReturn {
  shiftKeyDown: React.MutableRefObject<boolean>;
}

export default function useGameKeyboardControls({
  onKeyDown,
  preventKeyDownEvent = false,
}: UseGameKeyboardControlsProps): UseGameKeyboardControlsReturn {
  const shiftKeyDown = useRef(false);

  const handleKeyDownEvent = useCallback((event: KeyboardEvent) => {
    if (preventKeyDownEvent) {
      return;
    }

    const { code } = event;

    // Track shift key state
    if (code.startsWith('Shift')) {
      shiftKeyDown.current = true;
    }

    // prevent arrow keys from scrolling the sidebar
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault();
    }

    onKeyDown(code);
  }, [onKeyDown, preventKeyDownEvent]);

  const handleKeyUpEvent = useCallback((event: KeyboardEvent) => {
    const code = event.code;

    if (code.startsWith('Shift')) {
      shiftKeyDown.current = false;
    }
  }, []);

  const handleBlurEvent = useCallback(() => {
    shiftKeyDown.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('blur', handleBlurEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    document.addEventListener('keyup', handleKeyUpEvent);

    return () => {
      window.removeEventListener('blur', handleBlurEvent);
      document.removeEventListener('keydown', handleKeyDownEvent);
      document.removeEventListener('keyup', handleKeyUpEvent);
    };
  }, [handleBlurEvent, handleKeyDownEvent, handleKeyUpEvent]);

  return {
    shiftKeyDown,
  };
}
