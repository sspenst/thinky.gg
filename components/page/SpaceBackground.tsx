import React, { useMemo } from 'react';

interface SpaceBackgroundProps {
  children: React.ReactNode;
  starCount?: number;
  constellationPattern?: 'default' | 'leaderboard' | 'chapter' | 'custom';
  customConstellations?: Array<{
    left: string;
    top: string;
    size?: string;
    color?: string;
    delay?: string;
    duration?: string;
    glow?: boolean;
  }>;
  showGeometricShapes?: boolean;
  showBottomGradient?: boolean;
  className?: string;
  useFullHeight?: boolean;
}

// Move pseudoRandom outside component to avoid recreating it
const pseudoRandom = (seed: number, max: number) => ((seed * 9.869604401089358) % max);

const SpaceBackground = React.memo(function SpaceBackground({
  children,
  starCount = 60,
  constellationPattern = 'default',
  customConstellations,
  showGeometricShapes = true,
  showBottomGradient = true,
  className = '',
  useFullHeight = false,
}: SpaceBackgroundProps) {
  // Memoize constellation positions - only recalculate when pattern or custom constellations change
  const constellations = useMemo(() => {
    if (customConstellations) return customConstellations;

    // Use a stable seed instead of Date.now() - this prevents constant recalculation
    // You can change this seed periodically if you want variation, but not on every render
    const timeSeed = 42; // Fixed seed for stable positions

    switch (constellationPattern) {
    case 'leaderboard':
      return [...Array(8)].map((_, i) => {
        const baseLeft = 20 + (i % 3) * 25;
        const baseTop = 15 + Math.floor(i / 3) * 20;
        const leftVariation = pseudoRandom(timeSeed + i * 7, 10) - 5;
        const topVariation = pseudoRandom(timeSeed + i * 11, 10) - 5;

        return {
          left: `${Math.max(10, Math.min(90, baseLeft + leftVariation))}%`,
          top: `${Math.max(10, Math.min(80, baseTop + topVariation))}%`,
          size: `${4 + pseudoRandom(timeSeed + i * 13, 3)}px`,
          color: 'bg-yellow-400',
          delay: `${i * 0.3 + pseudoRandom(timeSeed + i * 17, 10) / 20}s`,
          duration: `${2.5 + pseudoRandom(timeSeed + i * 19, 10) / 10}s`,
          glow: true,
        };
      });

    case 'chapter':
      return [...Array(6)].map((_, i) => {
        const baseLeft = 15 + (i % 3) * 30;
        const baseTop = 20 + Math.floor(i / 3) * 25;
        const leftVariation = pseudoRandom(timeSeed + i * 7, 10) - 5;
        const topVariation = pseudoRandom(timeSeed + i * 11, 10) - 5;

        return {
          left: `${Math.max(10, Math.min(90, baseLeft + leftVariation))}%`,
          top: `${Math.max(10, Math.min(80, baseTop + topVariation))}%`,
          size: `${5 + pseudoRandom(timeSeed + i * 13, 3)}px`,
          color: 'bg-blue-400',
          delay: `${i * 0.2 + pseudoRandom(timeSeed + i * 17, 10) / 20}s`,
          duration: `${3 + pseudoRandom(timeSeed + i * 19, 10) / 10}s`,
          glow: true,
        };
      });

    default:
      return [];
    }
  }, [constellationPattern, customConstellations]);

  // Memoize regular star positions - calculate once and reuse
  const regularStars = useMemo(() => {
    return [...Array(starCount)].map((_, i) => {
      // Use stable values without Date.now()
      const left = pseudoRandom(i * 2.3, 100);
      const top = pseudoRandom(i * 3.7, 100);
      const size = pseudoRandom(i * 1.3, 3) + 1;
      const delay = pseudoRandom(i * 2.1, 4);
      const duration = pseudoRandom(i * 1.7, 3) + 1;
      const opacity = 0.3 + pseudoRandom(i * 7.1, 7) / 10;

      return {
        key: i,
        left,
        top,
        size,
        delay,
        duration,
        opacity,
      };
    });
  }, [starCount]);

  return (
    <div className={`relative ${useFullHeight ? 'h-full' : 'min-h-screen'} bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden ${className}`}>
      {/* Animated Star Field Background */}
      <div className='absolute inset-0 animate-fadeIn'>
        {/* Regular stars */}
        {regularStars.map((star) => (
          <div
            key={star.key}
            className='absolute bg-white rounded-full animate-pulse'
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
              opacity: star.opacity,
            }}
          />
        ))}

        {/* Constellation stars */}
        {constellations.map((star, i) => (
          <div
            key={`constellation-star-${i}`}
            className={`absolute ${star.color || 'bg-white'} rounded-full animate-pulse`}
            style={{
              left: star.left,
              top: star.top,
              width: star.size || '5px',
              height: star.size || '5px',
              animationDelay: star.delay || '0s',
              animationDuration: star.duration || '2s',
              ...(star.glow ? {
                boxShadow: star.color?.includes('yellow')
                  ? '0 0 10px rgba(250, 204, 21, 0.7)'
                  : star.color?.includes('blue')
                    ? '0 0 10px rgba(96, 165, 250, 0.7)'
                    : '0 0 10px rgba(255, 255, 255, 0.5)'
              } : {}),
            }}
          />
        ))}

        {/* Special champion star for leaderboard */}
        {constellationPattern === 'leaderboard' && (
          <div
            className='absolute bg-linear-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse'
            style={{
              left: '85%',
              top: '20%',
              width: '8px',
              height: '8px',
              animationDuration: '1.8s',
              boxShadow: '0 0 16px rgba(250, 204, 21, 0.9)',
            }}
          />
        )}
      </div>

      {/* Floating Geometric Shapes */}
      {showGeometricShapes && (
        <div className='absolute inset-0 animate-fadeIn' style={{ animationDelay: '0.3s' }}>
          <div className='absolute top-10 left-5 w-32 h-32 border-4 border-cyan-400 transform rotate-45 animate-spin opacity-10' style={{ animationDuration: '25s' }} />
          <div className='absolute top-20 right-5 w-24 h-24 bg-linear-to-r from-purple-500 to-pink-500 transform rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1s' }} />
          <div className='absolute bottom-10 right-10 w-20 h-20 bg-linear-to-r from-blue-500 to-green-500 transform -rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1.5s' }} />
          <div className='absolute top-3/4 left-5 w-28 h-28 border-4 border-pink-400 transform rotate-12 animate-spin opacity-10' style={{ animationDuration: '30s' }} />
        </div>
      )}

      {/* Bottom Gradient Overlay */}
      {showBottomGradient && (
        <div className='absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-indigo-900 via-purple-900/50 to-transparent z-5' />
      )}

      {/* Content */}
      <div className={`relative z-10 ${useFullHeight ? 'h-full' : ''}`}>
        {children}
      </div>
    </div>
  );
});

export default SpaceBackground;
