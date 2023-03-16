import Link from 'next/link';
import React, { useContext } from 'react';
import Role from '../../constants/role';
import { AppContext } from '../../contexts/appContext';

export default function ProAccountForm({ stripePaymentLink }: { stripePaymentLink: string}) {
  const { mutateUser, user, userConfig } = useContext(AppContext);
  const hasPro = user?.roles?.includes(Role.PRO_SUBSCRIBER);

  if (!stripePaymentLink) {
    return (
      <div className='flex justify-center items-center p-3'>
        <div className='flex flex-col gap-3'>
          <div className='font-bold'>Pathology Pro Account</div>
          <div className='text-sm'>
                Could not load upgrade page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex justify-center items-center p-3'>
      <div className='flex flex-col gap-3'>
        <div className='font-bold'>Pathology Pro Account</div>
        {hasPro ? (
          <div className='text-sm'>
            You are a pro subscriber
          </div>
        ) : (
          <div className='text-sm'>
            <Link href={stripePaymentLink + '?client_reference_id=' + user?._id} className='text-blue-500'>
              Click here
            </Link>{' '}
            to upgrade to Pathology Pro to get access to member-only features.
          </div>
        )}

        <div className='mt-4'>
          <h2 className='font-semibold text-lg mb-2'>Pro Features:</h2>
          <ul className='list-disc list-inside'>
            <li>Advanced search ability</li>
            <li>Badge icon next to username</li>
            <li>
              Advanced statistics <span className='text-yellow-500'>(Coming soon)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
