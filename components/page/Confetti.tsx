import confetti from 'canvas-confetti';
import React, { useRef } from 'react';

let confettiInstance: () => void;

export const dropConfetti = () => {
  if (confettiInstance) {
    confettiInstance();
  }
};

export function Confetti() {
  const canvasRef = useRef(null);

  confettiInstance = () => {
    const duration = 1200; // last for 1.2 second
    const end = Date.now() + duration;

    function frame() {
      confetti({
        particleCount: 3,
        angle: 20,
        spread: 120,
        origin: { x: -.1 },
        decay: 0.9,
      });
      confetti({
        particleCount: 3,
        angle: 160,
        spread: 120,
        origin: { x: 1.1 },

      });
    }

    requestAnimationFrame(function loop(time) {
      if (Date.now() < end) {
        frame();
        requestAnimationFrame(loop);
      }
    } );
  };

  return (
    <canvas
      ref={canvasRef}
      className='absolute top-0 left-0 w-full h-full pointer-events-none'
    />
  );
}
