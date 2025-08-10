import { GameState } from '@root/helpers/gameStateHelpers';
import { Redo, Undo } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Control from '../models/control';

interface UseGameControlsProps {
  gameState: GameState;
  isMobile: boolean;
  isPro: boolean;
  onKeyDown: (code: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  extraControls?: Control[];
}

interface UseGameControlsReturn {
  controls: Control[];
}

export default function useGameControls({
  gameState,
  isMobile,
  isPro,
  onKeyDown,
  onNext,
  onPrev,
  extraControls,
}: UseGameControlsProps): UseGameControlsReturn {
  const [controls, setControls] = useState<Control[]>([]);

  useEffect(() => {
    const _controls: Control[] = [];

    if (onPrev) {
      const leftArrow = React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        fill: 'none',
        viewBox: '0 0 24 24',
        strokeWidth: 1.5,
        stroke: 'currentColor',
        className: 'w-6 h-6'
      }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        d: 'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18'
      }));

      const prevTxt = isMobile ? leftArrow : React.createElement('div', {},
        React.createElement('span', { className: 'underline' }, 'P'), 'rev Level'
      );

      _controls.push(new Control('btn-prev', () => onPrev(), prevTxt));
    }

    const restartIcon = React.createElement('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: 1.5,
      stroke: 'currentColor',
      className: 'w-6 h-6'
    }, React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
    }));

    const restartTxt = isMobile ? restartIcon : React.createElement('div', {},
      React.createElement('span', { className: 'underline' }, 'R'), 'estart'
    );

    const undoTxt = isMobile ?
      React.createElement('span', {}, React.createElement(Undo, { className: 'w-6 h-6' })) :
      React.createElement('div', {},
        React.createElement('span', { className: 'underline' }, 'U'), 'ndo'
      );

    const redoTxt = isMobile ?
      React.createElement('span', {}, React.createElement(Redo, { className: 'w-6 h-6' })) :
      React.createElement('div', {},
        'Redo (', React.createElement('span', { className: 'underline' }, 'Y'), ')'
      );

    _controls.push(
      new Control('btn-restart', () => onKeyDown('KeyR'), restartTxt),
      new Control('btn-undo', () => onKeyDown('Backspace'), undoTxt, false, false, () => {
        onKeyDown('Backspace');

        return true;
      }),
      new Control(
        'btn-redo',
        () => onKeyDown('KeyY'),
        React.createElement('span', { className: 'flex gap-2 justify-center select-none' },
          !isPro ? React.createElement('img', {
            className: 'pointer-events-none z-0',
            alt: 'pro',
            src: '/pro.svg',
            width: '16',
            height: '16'
          }) : null,
          redoTxt
        ),
        gameState.redoStack.length === 0,
        false,
        () => {
          onKeyDown('KeyY');

          return true;
        },
      ),
    );

    if (onNext) {
      const rightArrow = React.createElement('span', { className: 'truncate' },
        React.createElement('svg', {
          xmlns: 'http://www.w3.org/2000/svg',
          fill: 'none',
          viewBox: '0 0 24 24',
          strokeWidth: 1.5,
          stroke: 'currentColor',
          className: 'w-6 h-6'
        }, React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          d: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3'
        }))
      );

      const nextTxt = isMobile ? rightArrow : React.createElement('div', {},
        React.createElement('span', { className: 'underline' }, 'N'), 'ext Level'
      );

      _controls.push(new Control('btn-next', () => onNext(), nextTxt));
    }

    if (extraControls) {
      setControls(_controls.concat(extraControls));
    } else {
      setControls(_controls);
    }
  }, [extraControls, gameState.redoStack.length, onKeyDown, isMobile, onNext, onPrev, isPro, gameState.moves.length]);

  return {
    controls,
  };
}
