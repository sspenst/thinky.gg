// No direction imports needed for this hook
import { useCallback, useEffect } from 'react';

interface UseKeyboardControlsProps {
  onKeyDown: (code: string) => void;
  preventKeyDownEvent?: boolean;
  shiftKeyDown: React.MutableRefObject<boolean>;
}

export default function useKeyboardControls({
  onKeyDown,
  preventKeyDownEvent = false,
  shiftKeyDown,
}: UseKeyboardControlsProps): void {
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
  }, [onKeyDown, preventKeyDownEvent, shiftKeyDown]);

  const handleKeyUpEvent = useCallback((event: KeyboardEvent) => {
    const code = event.code;

    if (code.startsWith('Shift')) {
      shiftKeyDown.current = false;
    }
  }, [shiftKeyDown]);

  const handleBlurEvent = useCallback(() => {
    shiftKeyDown.current = false;
  }, [shiftKeyDown]);

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
}
