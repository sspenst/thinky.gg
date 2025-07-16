import { LucideMaximize2 } from 'lucide-react';
import Image from 'next/image';

export const ICON_UNDO = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
  <path strokeLinecap='round' strokeLinejoin='round' d='M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3' />
</svg>);

export const ICON_REDO = (<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
  <path strokeLinecap='round' strokeLinejoin='round' d='M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3' />
</svg>);

export const ICON_RESIZE = <LucideMaximize2 />;

export const ICON_PRO_16 = <Image alt='pro' src='/pro.svg' width='16' height='16' />;
