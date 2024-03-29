import { directionToVector, getDirectionFromCode } from '@root/constants/direction';
import Position from '@root/models/position';
import React, { useEffect, useState } from 'react';

interface HeaderPlayerProps {
  children: React.ReactNode;
  size: number;
}

export default function HeaderPlayer({ children, size }: HeaderPlayerProps) {
  const [pos, setPos] = useState(new Position(0, 0));

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      window.location.pathname.includes('/level') ||
      window.location.pathname.includes('/match') ||
      window.location.pathname.includes('/tutorial') ||
      window.location.pathname.includes('/test')
    ) {
      return;
    }

    const direction = getDirectionFromCode(event.code);

    if (direction) {
      setPos(prevPos => prevPos.add(directionToVector(direction)));

      return;
    }

    if (event.code === 'KeyR') {
      setPos(new Position(0, 0));
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div style={{
      width: size,
      height: size,
    }}>
      <div
        className='absolute'
        style={{
          background: 'rgb(0, 0, 0, 0)',
          transform: `translate(${pos.x * size}px, ${pos.y * size}px)`,
          transition: 'transform 0.1s',
        }}
      >
        {children}
      </div>
    </div>
  );
}
