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
      const angle = 25 * Math.cos((Date.now() - end) / duration * Math.PI * 10);

      confetti({
        particleCount: 3,
        angle: 30 + angle,
        spread: 10,
        origin: { x: -.1 },
        startVelocity: 40 + Math.random() * 15,
      });
      confetti({
        particleCount: 3,
        angle: 150 + angle,
        spread: 10,
        origin: { x: 1.1 },
        startVelocity: 40 + Math.random() * 15,
      });
    }

    requestAnimationFrame(function loop() {
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
