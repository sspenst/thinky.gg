import JSConfetti from 'js-confetti';
import React, { useEffect, useRef } from 'react';

let confettiInstance: JSConfetti;

export const dropConfetti = () => {
  if (!confettiInstance) {
    confettiInstance = new JSConfetti();
  }

  confettiInstance.addConfetti();
};

export function Confetti() {
  const jsConfettiCanvas = useRef<HTMLCanvasElement>(null);

  if (!jsConfettiCanvas.current) {
    return;
  }

  return <canvas className='absolute top-0 left-0 w-full h-full pointer-events-none' ref={jsConfettiCanvas} />;
}
