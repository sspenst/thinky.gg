import Image from 'next/image';
import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { EnrichedLevel } from '../../models/db/level';
import Complete from '../level/info/complete';
import LoadingSpinner from '../page/loadingSpinner';

interface EnrichedLevelLinkProps {
  level: EnrichedLevel;
  onClick?: () => void;
}

export default function FormattedLevelLink({ level, onClick }: EnrichedLevelLinkProps) {
  const isComplete = level.userMoves === level.leastMoves;
  const [showPopover, setShowPopover] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const setTimer = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className='flex flex-col gap-2 truncate'
      onMouseOut={() => {
        if (setTimer.current) {
          clearTimeout(setTimer.current);
        }
      }}
    >

      <Link
        className='flex items-center font-bold underline w-fit max-w-full'
        href={`/level/${level.slug}`}
        onClick={onClick}
        onMouseOut={() => {
          if (setTimer.current) {
            clearTimeout(setTimer.current);
          }

          setShowPopover(false);
        }}
        onMouseOver={event => {
          if (setTimer.current) {
            clearTimeout(setTimer.current);
          }

          const rect = (event.target as HTMLDivElement).getBoundingClientRect();

          // adjust for scroll position
          setPosition({ x: rect.left, y: rect.top + window.scrollY - 0 });

          setTimer.current = setTimeout(() => setShowPopover(true), 750);
        }}
        passHref
        prefetch={false}
        style={{
          color: level.userMoves ? (isComplete ? 'var(--color-complete)' : 'var(--color-incomplete)') : undefined,
          // to handle zero width level names
          minWidth: 10,
        }}
      >
        <span className='truncate'>{level.name}</span>
        {isComplete && <Complete className='-mr-1' />}
      </Link>

      <div
        className={'z-10 rounded-lg transition-all duration-300 '}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: 'var(--bg-color)',
          cursor: 'pointer',
          /* animate height */
          transition: 'all 0.5s ease-in-out',
          display: showPopover ? 'block' : 'none',

          maxHeight: showPopover ? '1000px' : '0px',
        }}
      >
        <div className=''>

          <div className='flex flex-col gap-2 w-200 h-200'>
            { isLoading && <div className='flex flex-row gap-2 justify-center items-center'><span>Loading...</span> <LoadingSpinner /></div>}
            <Image src={'/api/level/image/' + level._id + '.png'} width={200} height={200} alt={level.name}
              style={{
              // when loading we dont want to show the image
                opacity: isLoading ? 0 : 1,
                width: isLoading ? 0 : 'auto',
                height: isLoading ? 0 : 'auto',
              }}
              /* loading spinner placeholder */
              onLoad={() => setIsLoading(false)} onError={() => setIsLoading(false)}
            />
          </div>

        </div>
      </div>

    </div>
  );
}
