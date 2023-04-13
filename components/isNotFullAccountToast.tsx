import Link from 'next/link';
import React from 'react';
import { toast } from 'react-hot-toast';

export default function isNotFullAccountToast(verb: string) {
  toast.dismiss();
  toast.error(
    <div className='flex'>
      <div className='flex flex-col gap-2'>
        <span>Error: {verb} requires a full account with a verified email</span>
        <Link className='text-blue-500 w-fit' href='/settings/account'>Update here</Link>
      </div>
      <svg className='h-5 w-5 my-1.5 ml-2 cursor-pointer' fill={'var(--bg-color-4)'} version='1.1' id='Capa_1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' x='0px' y='0px' viewBox='0 0 460.775 460.775' xmlSpace='preserve' onClick={() => toast.dismiss()}>
        <path d='M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
        c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
        c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
        c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
        l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
        c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z' />
      </svg>
    </div>,
    { duration: 3000 },
  );
}
