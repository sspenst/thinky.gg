import classNames from 'classnames';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { start } from 'nprogress';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import Stripe from 'stripe';
import Role from '../../constants/role';
import Theme from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import isTheme from '../../helpers/isTheme';
import useSWRHelper from '../../hooks/useSWRHelper';
import { SubscriptionData } from '../../pages/api/subscription';

/**
 * subscriptionId: subscription.id,
      plan: subscription.items.data[0].plan,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
 */

export default function ProAccountForm({ stripePaymentLink }: { stripePaymentLink: string}) {
  const { mutateUser, user } = useContext(AppContext);
  const hasPro = user?.roles?.includes(Role.PRO_SUBSCRIBER);
  // if query string confirm=1 then this should be true
  const confirmQueryString = window.location.search.includes('confirm=1');
  const [shouldContinouslyFetch, setShouldContinouslyFetch] = useState(confirmQueryString);
  const router = useRouter();
  const { data: subscriptionData } = useSWRHelper<SubscriptionData>('/api/subscription');

  console.log(subscriptionData);

  useEffect(() => {
    if (shouldContinouslyFetch) {
      const interval = setInterval(() => {
        mutateUser();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [mutateUser, shouldContinouslyFetch]);

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

  async function fetchUnsubscribe() {
    toast.dismiss();
    toast.loading('Unsubscribing...');
    const res = await fetch('/api/subscription', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      toast.dismiss();
      toast.success('Unsubscribed successfully!');
      // go to this page but with ?confirm=1
      router.push('/settings?tab=proaccount&confirm=1');
      mutateUser();
    } else {
      toast.dismiss();

      try {
        const resp = await res.json();

        toast.error(resp?.error || 'An error occurred.');
      } catch (e) {
        toast.error('An error occurred.');
      }
    }
  }

  const buttonClassNames = classNames('py-2.5 px-3.5 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap',
    isTheme(Theme.Light) ?
      'bg-green-100 hover:bg-gray-50 border-gray-300 text-gray-700' :
      'bg-gray-800 hover:bg-slate-600 border-gray-700 text-gray-300'
  );

  return (
    <div className='flex justify-center items-center p-3'>
      <div className='flex flex-col gap-3'>
        <div className='font-bold'>Pathology Pro Account</div>
        {hasPro ? (
          <div className='flex flex-row gap-3'>
            <div className='text-sm'>
            You are a pro subscriber. Thank you for your support!

              <div>Details</div>
              <div>Plan: <span className='font-bold'>{subscriptionData?.status}</span></div>
              <div>Current Period End: {moment(new Date(subscriptionData?.current_period_end * 1000)).format('MMMM Do YYYY')}</div>
              <div className='font-bold'>{subscriptionData?.cancel_at_period_end ? 'Cancel at period end' : ''}</div>
            </div>
            <button className={buttonClassNames} onClick={() => { if (confirm('Are you sure you would like to unsubscribe from your Pro account?')) {fetchUnsubscribe(); }} }>
              Unsubscribe
            </button>
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
