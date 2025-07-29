import { AppContext } from '@root/contexts/appContext';
import getPngDataClient from '@root/helpers/getPngDataClient';
import useUrl from '@root/hooks/useUrl';
import { EnrichedLevel } from '@root/models/db/level';
import Link from 'next/link';
import { useContext, useMemo } from 'react';

interface ChapterLevelPortalProps {
  href?: string;
  id: string;
  level: EnrichedLevel | undefined | null;
  onClick?: () => void;
}

export default function ChapterLevelPortal({ href, id, level, onClick }: ChapterLevelPortalProps) {
  const { game: pageGame } = useContext(AppContext);
  const getUrl = useUrl();

  const defaultUrl = getUrl(level?.gameId, `/level/${level?.slug}`);

  const backgroundImage = useMemo(() => {
    if (level && level.data) {
      return getPngDataClient(level.gameId || pageGame.id, level.data);
    }

    return undefined;
  }, [pageGame.id, level]);

  if (level === undefined) {
    return (
      <div className='group relative'>
        <div className='relative bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden shadow-lg border-2 border-gray-300 dark:border-gray-600 animate-pulse w-28 h-[70px] sm:w-32 sm:h-20 lg:w-36 lg:h-[90px]'>
          <div className='h-full flex items-center justify-center'>
            <div className='w-4 h-4 sm:w-6 sm:h-6 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce' />
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return null;
  }

  const isComplete = level.userMoves === level.leastMoves;
  const isAttempted = level.userMoves !== undefined;

  return (
    <div className='group relative transform hover:scale-105 hover:-translate-y-1 transition-all duration-300'>
      {/* Card Glow Effect */}
      <div className={`absolute inset-0 rounded-xl blur-lg opacity-30 transition-all duration-300 ${
        isComplete ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
          isAttempted ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
            'bg-gradient-to-br from-purple-400 to-pink-500'
      } group-hover:opacity-50`} />
      {/* Main Level Card */}
      <div className='relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 transition-all duration-300 group-hover:shadow-2xl w-28 h-[70px] sm:w-32 sm:h-20 lg:w-36 lg:h-[90px]' style={{
        borderColor: isComplete ? '#10b981' : isAttempted ? '#f59e0b' : '#8b5cf6'
      }}>
        <Link
          href={href ?? (defaultUrl || `/level/${level.slug}`)}
          onClick={onClick}
          className='block relative w-full h-full'
        >
          {/* Level Preview Background */}
          <div
            className='absolute inset-0 bg-cover bg-center opacity-70'
            style={{
              backgroundImage: backgroundImage ? 'url("' + backgroundImage + '")' : 'none',
            }}
          />
          
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br opacity-40 ${
            isComplete ? 'from-green-400/30 to-emerald-500/30' :
              isAttempted ? 'from-yellow-400/30 to-orange-500/30' :
                'from-purple-400/30 to-pink-500/30'
          }`} />
          {/* Hover Overlay with Title */}
          <div className='absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex items-center justify-center p-1 sm:p-2'>
            <div className='text-white text-center'>
              <div className='text-xs sm:text-sm font-bold leading-tight'>
                {level.name}
              </div>
            </div>
          </div>
          
          {/* Status Icons & Info */}
          <div className='relative z-10 h-full flex flex-col justify-between p-2 group-hover:opacity-0 transition-opacity duration-300'>
            {/* Top Row - Status Icon */}
            <div className='flex justify-between items-start'>
              {(isComplete || isAttempted) && (
                <div className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs font-bold ${
                  isComplete ? 'bg-green-500 text-white' :
                    'bg-yellow-500 text-yellow-900'
                }`}>
                  <span className='hidden sm:inline'>{isComplete ? 'SOLVED' : 'STARTED'}</span>
                  <span className='sm:hidden'>{isComplete ? '✓' : '◐'}</span>
                </div>
              )}
              
              {/* Completion Star */}
              {isComplete && (
                <div className='text-sm sm:text-lg text-green-500'>⭐</div>
              )}
            </div>
            
            {/* Bottom Row - Move Counter */}
            <div className='flex justify-between items-end'>
              <div className={'text-xs font-bold px-2 py-1 rounded bg-black/70 text-white'}>
                {level.userMoves === undefined ? '?' : level.userMoves}/{level.leastMoves}
              </div>
              
              {/* Progress Indicator */}
              {isAttempted && !isComplete && (
                <div className='w-2 h-2 bg-yellow-400 rounded-full animate-ping' />
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
