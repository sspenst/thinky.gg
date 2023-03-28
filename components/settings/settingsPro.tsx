import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Theme from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
import isTheme from '../../helpers/isTheme';
import useSWRHelper from '../../hooks/useSWRHelper';
import { SubscriptionData } from '../../pages/api/subscription';

interface ProFeatureProps {
  description: string;
  icon: JSX.Element;
  title: string;
}

function ProFeature({ description, icon, title }: ProFeatureProps) {
  return (
    <div className='flex gap-4 items-center'>
      <div className='flex justify-center' style={{
        minWidth: 32,
        width: 32,
      }}>
        {icon}
      </div>
      <div className='flex flex-col gap-1'>
        <div className='font-bold'>{title}</div>
        <div className='text-xs'>{description}</div>
      </div>
    </div>
  );
}

interface SettingsProProps {
  stripePaymentLink: string;
}

export default function SettingsPro({ stripePaymentLink }: SettingsProProps) {
  const { mutateUser, user, userLoading } = useContext(AppContext);
  // if query string confirm=1 then this should be true

  const [shouldContinouslyFetch, setShouldContinouslyFetch] = useState(false);

  useEffect(() => {
    const confirmQueryString = window.location.search.includes('confirm=1');

    setShouldContinouslyFetch(confirmQueryString);
  }, []);
  const router = useRouter();
  const { data: subscriptionData } = useSWRHelper<SubscriptionData>('/api/subscription');

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
      router.push('/settings/proaccount?confirm=1');
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

  const buttonClassNames = classNames('py-2.5 px-3.5 mt-2 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap',
    isTheme(Theme.Light) ?
      'bg-green-100 hover:bg-gray-50 border-gray-300 text-gray-700' :
      'bg-gray-800 hover:bg-slate-600 border-gray-700 text-gray-300'
  );

  return (
    <div className='flex flex-col justify-center items-center gap-4'>
      {isPro(user) &&
        <div className='flex flex-col gap-4 text-center justify-center items-center'>
          <div>
            You have subscribed to Pathology Pro. Thank you for your support!
          </div>
          {subscriptionData &&
            <div className='border border-green-300 rounded-md w-fit px-3 py-2'>
              <div className='font-bold'>Subscription Details:</div>
              <div className='text-sm'>
                <div>Status: <span className='font-bold'>{subscriptionData.status}</span></div>
                {subscriptionData.current_period_end && (<div>Current period end date: {moment(new Date(subscriptionData.current_period_end * 1000)).format('MMMM Do, YYYY')}</div>)}
                {subscriptionData.cancel_at_period_end ?
                  <span className='font-bold'>
                    Subscription will cancel at period end
                  </span>
                  :
                  <button className={buttonClassNames} onClick={() => { if (confirm('Are you sure you would like to unsubscribe from your Pro account?')) {fetchUnsubscribe(); }} }>
                    Unsubscribe
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
      <div className='flex flex-col items-center justify-center gap-4'>
        <h2 className='font-bold text-xl'>Pathology Pro Features:</h2>
        <div className='flex flex-col items-left gap-4'>
          <ProFeature
            description='Displayed next to your username across the site'
            icon={<Image alt='pro' src='/pro.svg' width='24' height='24' />}
            title='Pro Badge'
          />
          <ProFeature
            description='Save multiple game states for each level'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(239 68 68)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
              </svg>
            }
            title='Checkpoints'
          />
          <ProFeature
            description='View all solves on levels and analyze your play time'
            icon={
              <div className='rounded-full bg-green-500 border' style={{
                borderColor: 'var(--bg-color-4)',
              }}>
                <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
                </svg>
              </div>
            }
            title='Extra level stats'
          />
          <ProFeature
            description='Search by block type, find unattempted levels, and more'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            }
            title='Advanced search filters'
          />
          <ProFeature
            description='Details on completed levels per user and per creator'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(234 179 8)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' />
              </svg>
            }
            title='User insights'
          />
        </div>
        {!userLoading && !isPro(user) && <>
          <div className='border-green-300 border font-medium text-sm py-2 px-4 rounded-lg' style={{
          }}>
            $3 / month
          </div>
          <Link href={stripePaymentLink + '?client_reference_id=' + user?._id} className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline cursor-pointer'>
            Subscribe
          </Link>
        </>}
      </div>
    </div>
  );
}
