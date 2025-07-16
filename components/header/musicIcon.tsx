import { MusicContext } from '@root/contexts/musicContext';
import classNames from 'classnames';
import { useContext } from 'react';

export default function MusicIcon() {
  const { isHot, isPlaying } = useContext(MusicContext);

  return (
    <div className={classNames({ 'animate-pulse': isPlaying }, isPlaying && (isHot ? 'text-orange-400' : 'text-blue-400'))}>
      <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-5 h-5'>
        <path strokeLinecap='round' strokeLinejoin='round' d='M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z' />
      </svg>
    </div>
  );
}
