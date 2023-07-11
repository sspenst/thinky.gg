import { RadioGroup } from '@headlessui/react';
import isPro from '@root/helpers/isPro';
import classNames from 'classnames';
import moment from 'moment';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Theme from '../../constants/theme';
import { AppContext } from '../../contexts/appContext';
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
        <div className='font-bold text-lg'>{title}</div>
        <div className='text-sm'>{description}</div>
      </div>
    </div>
  );
}

interface SettingsProProps {
  stripeCustomerPortalLink: string;
  stripePaymentLink: string;
  stripePaymentYearlyLink: string;
}

export default function SettingsPro({ stripeCustomerPortalLink, stripePaymentLink, stripePaymentYearlyLink }: SettingsProProps) {
  const { mutateUser, theme, user, userLoading } = useContext(AppContext);
  const [plan, setPlan] = useState('year');
  const [shouldContinouslyFetch, setShouldContinouslyFetch] = useState(false);
  const { data: subscriptionData } = useSWRHelper<SubscriptionData>('/api/subscription');

  useEffect(() => {
    const confirmQueryString = window.location.search.includes('confirm=1');

    setShouldContinouslyFetch(confirmQueryString);
  }, []);

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
      <div className='text-center'>
        Error loading Pathology Pro page.
      </div>
    );
  }

  const buttonClassNames = classNames('py-2.5 px-3.5 mt-2 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap',
    theme === Theme.Light ?
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
            <div className={classNames(
              'border rounded-md w-fit px-3 py-2',
              subscriptionData.cancel_at_period_end ? 'border-red-300' : 'border-green-300',
            )}>
              <div className='font-bold'>Subscription Details:</div>
              <div className='text-sm'>
                <div>Status: <span className='font-bold'>{subscriptionData.cancel_at_period_end ? 'Canceled' : 'Active'}</span></div>
                {subscriptionData.current_period_end && (<div>Current period end date: {moment(new Date(subscriptionData.current_period_end * 1000)).format('MMMM Do, YYYY')}</div>)}
                {subscriptionData.cancel_at_period_end ?
                  <span className='font-bold'>
                    Subscription will cancel at period end
                  </span>
                  :
                  <a
                    className={buttonClassNames}
                    href={stripeCustomerPortalLink || ''}
                    rel='noreferrer'
                    target='_blank'
                  >
                    Manage Billing
                  </a>
                }
                <p className='mt-4 text-xs'>For any questions please contact <Link className='text-blue-300' href='mailto:help@pathology.gg'>help@pathology.gg</Link>.</p>
              </div>
            </div>
          }
        </div>
      }
      <div className='flex flex-col items-center justify-center gap-4'>
        <h2 className='font-bold text-2xl'>Pathology Pro Features:</h2>
        <div className='flex flex-col items-left gap-4'>
          <ProFeature
            description='Displayed next to your username across the site'
            icon={<Image alt='pro' src='/pro.svg' width='24' height='24' />}
            title='Pro Badge'
          />
          <ProFeature
            description='Redo your moves in the game.'
            icon={<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' className='bi bi-arrow-clockwise' viewBox='0 0 16 16'>
              <path fillRule='evenodd' d='M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z' />
              <path d='M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z' />
            </svg>}
            title='Redo'
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
            description='View all solves and analyze your play time'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(34 197 94)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' />
              </svg>
            }
            title='Extra Level Stats'
          />
          <ProFeature
            description='Search by block type, level dimensions, and more'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            }
            title='Advanced Search Filters'
          />
          <ProFeature
            description='Details on levels completed per user and per creator'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(234 179 8)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' />
              </svg>
            }
            title='User Insights'
          />
        </div>
        {!userLoading && !isPro(user) &&
          <>
            <div className='flex flex-col gap-3 w-fit items-center mt-3'>
              <RadioGroup value={plan} onChange={setPlan} className='flex flex-wrap justify-center gap-3'>
                <RadioGroup.Option value='year'>
                  {({ checked }) => (
                    <div className={classNames(
                      'flex flex-col border-2 text-sm py-2 px-4 rounded-xl cursor-pointer gap-0.5 subscription-plan-button transition',
                      { 'border-green-300': checked },
                    )} style={{
                      borderColor: !checked ? 'var(--bg-color)' : '',
                      color: 'var(--color-gray)',
                    }}>
                      <div className='flex gap-2 items-center'>
                        <span>Annual Plan</span>
                        <span className='text-xs rounded-md px-1' style={{
                          backgroundColor: 'var(--bg-color)',
                          color: 'rgb(134 239 172)',
                        }}>SAVE 25%</span>
                      </div>
                      <span className='font-bold text-lg' style={{ color: 'var(--color)' }}>$2.25 USD / month</span>
                      <span className='text-xs'>$27 per year billed annually</span>
                    </div>
                  )}
                </RadioGroup.Option>
                <RadioGroup.Option value='month'>
                  {({ checked }) => (
                    <div className={classNames(
                      'flex flex-col border-2 text-sm py-2 px-4 rounded-xl cursor-pointer gap-0.5 subscription-plan-button transition',
                      { 'border-green-300': checked },
                    )} style={{
                      borderColor: !checked ? 'var(--bg-color)' : '',
                      color: 'var(--color-gray)',
                    }}>
                      <span>Monthly Plan</span>
                      <span className='font-bold text-lg' style={{ color: 'var(--color)' }}>$3.00 USD / month</span>
                      <span className='text-xs'>$36 per year billed monthly</span>
                    </div>
                  )}
                </RadioGroup.Option>
              </RadioGroup>
              <a
                className='bg-green-300 hover:bg-green-500 text-black font-bold py-2 px-4 rounded-3xl focus:outline-none focus:shadow-outline cursor-pointer w-full text-center'
                href={`${plan === 'year' ? stripePaymentYearlyLink : stripePaymentLink}?client_reference_id=${user?._id}`}
                rel='noreferrer'
                target='_blank'
              >
                Subscribe
              </a>
            </div>
            <p className='text-xs text-center'>
              By clicking Subscribe, you agree to our <a className='text-blue-300' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>
                Terms of Service
              </a>.<br />Subscriptions auto-renew until canceled, as described in the Terms.
            </p>
          </>
        }
      </div>
    </div>
  );
}
