import isFullAccount from '@root/helpers/isFullAccount';
import isGuest from '@root/helpers/isGuest';
import User from '@root/models/db/user';
import Link from 'next/link';
import React from 'react';

export default function UpsellConvertOrConfirmTopBar({ user }: {user: User | null}) {
  return user && !isFullAccount(user) && ( <div className='bg-yellow-200 w-full text-black text-center text-sm p-2 shadow-lg'>
    <span className='font-bold'>{`${isGuest(user) ? 'Convert to a regular account' : 'Confirm your email'} `}</span>
    in your <Link className='font-semibold text-blue-600 hover:underline' href='/settings'>
        Account Settings
    </Link>
    {' to unlock all basic features!'}
  </div>
  );
}
