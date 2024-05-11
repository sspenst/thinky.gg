import Link from 'next/link';
import React from 'react';
import { toast } from 'react-hot-toast';
import DismissToast from './dismissToast';

export default function isNotFullAccountToast(verb: string) {
  toast.dismiss();
  toast.error(
    <div className='flex'>
      <div className='flex flex-col gap-2'>
        <span>Error: {verb} requires a full account with a confirmed email</span>
        <Link className='text-blue-500 w-fit' href='/settings'>Confirm here</Link>
      </div>
      <DismissToast />
    </div>,
    { duration: 3000 },
  );
}
