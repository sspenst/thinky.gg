import React from 'react';

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
}

export default function SpaceBackground({
  children,
  starCount = 60,
  constellationPattern = 'default',
  customConstellations,
  showGeometricShapes = true,
  showBottomGradient = true,
  className = '',
}: SpaceBackgroundProps) {
  const pseudoRandom = (seed: number, max: number) => ((seed * 9.869604401089358) % max);

  const getConstellations = () => {
    if (customConstellations) return customConstellations;

    // Use a deterministic seed based on the current timestamp divided by a large number
    // This creates subtle variations that change slowly over time
    const timeSeed = Math.floor(Date.now() / 100000);

    switch (constellationPattern) {
    case 'leaderboard':
      return [...Array(8)].map((_, i) => {
        // Add subtle random variations within a small range
        const baseLeft = 20 + (i % 3) * 25;
        const baseTop = 15 + Math.floor(i / 3) * 20;
        const leftVariation = pseudoRandom(timeSeed + i * 7, 10) - 5; // -5 to +5
        const topVariation = pseudoRandom(timeSeed + i * 11, 10) - 5; // -5 to +5

        return {
          left: `${Math.max(10, Math.min(90, baseLeft + leftVariation))}%`,
          top: `${Math.max(10, Math.min(80, baseTop + topVariation))}%`,
          size: `${4 + pseudoRandom(timeSeed + i * 13, 3)}px`, // 4-6px
          color: 'bg-yellow-400',
          delay: `${i * 0.3 + pseudoRandom(timeSeed + i * 17, 10) / 20}s`, // Add 0-0.5s variation
          duration: `${2.5 + pseudoRandom(timeSeed + i * 19, 10) / 10}s`, // 2.5-3.5s
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
          size: `${5 + pseudoRandom(timeSeed + i * 13, 3)}px`, // 5-7px
          color: 'bg-blue-400',
          delay: `${i * 0.2 + pseudoRandom(timeSeed + i * 17, 10) / 20}s`,
          duration: `${3 + pseudoRandom(timeSeed + i * 19, 10) / 10}s`, // 3-4s
          glow: true,
        };
      });

    default:
      return [];
    }
  };

  const constellations = getConstellations();

  return (
    <div className={`relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden ${className}`}>
      {/* Animated Star Field Background */}
      <div className='absolute inset-0 animate-fadeIn'>
        {/* Regular stars */}
        {[...Array(starCount)].map((_, i) => {
          // Add time-based variation to create subtle movement over time
          const timeSeed = Math.floor(Date.now() / 100000);
          const leftBase = pseudoRandom(i * 2.3, 100);
          const topBase = pseudoRandom(i * 3.7, 100);

          // Add very subtle drift based on time
          const leftDrift = pseudoRandom(timeSeed + i * 3, 4) - 2; // -2 to +2
          const topDrift = pseudoRandom(timeSeed + i * 5, 4) - 2; // -2 to +2

          const left = Math.max(0, Math.min(100, leftBase + leftDrift));
          const top = Math.max(0, Math.min(100, topBase + topDrift));
          const size = pseudoRandom(i * 1.3, 3) + 1;
          const delay = pseudoRandom(i * 2.1, 4);
          const duration = pseudoRandom(i * 1.7, 3) + 1;

          return (
            <div
              key={i}
              className='absolute bg-white rounded-full animate-pulse'
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                opacity: 0.3 + pseudoRandom(i * 7.1, 7) / 10, // 0.3 to 1.0
              }}
            />
          );
        })}
        
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
            className='absolute bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse'
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
          <div className='absolute top-20 right-5 w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 transform rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1s' }} />
          <div className='absolute bottom-10 right-10 w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 transform -rotate-12 animate-bounce opacity-10' style={{ animationDelay: '1.5s' }} />
          <div className='absolute top-3/4 left-5 w-28 h-28 border-4 border-pink-400 transform rotate-12 animate-spin opacity-10' style={{ animationDuration: '30s' }} />
        </div>
      )}
      
      {/* Bottom Gradient Overlay */}
      {showBottomGradient && (
        <div className='absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-indigo-900 via-purple-900/50 to-transparent z-5' />
      )}
      
      {/* Content */}
      <div className='relative z-10'>
        {children}
      </div>
    </div>
  );
}
