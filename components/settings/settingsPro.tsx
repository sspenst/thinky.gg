import { RadioGroup } from '@headlessui/react';
import { ProSubscriptionType } from '@root/constants/ProSubscriptionType';
import isPro from '@root/helpers/isPro';
import User from '@root/models/db/user';
import { SubscriptionGiftData } from '@root/pages/api/subscription/gift';
import classNames from 'classnames';
import dayjs from 'dayjs';
import Image from 'next/image';
import Link from 'next/link';
import React, { useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Stripe from 'stripe';
import { AppContext } from '../../contexts/appContext';
import useSWRHelper from '../../hooks/useSWRHelper';
import { SubscriptionData } from '../../pages/api/subscription';
import FormattedUser from '../formatted/formattedUser';
import LoadingSpinner from '../page/loadingSpinner';
import MultiSelectUser from '../page/multiSelectUser';
import { RefreshCcwDot, Spline } from 'lucide-react';


interface ProFeatureProps {
  description: string;
  icon: JSX.Element | React.ReactNode;
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
  stripeCustomerPortalLink?: string;
  stripePaymentLink?: string;
  stripePaymentYearlyLink?: string;
}

export default function SettingsPro({ stripeCustomerPortalLink, stripePaymentLink, stripePaymentYearlyLink }: SettingsProProps) {
  const { game, mutateUser, user } = useContext(AppContext);
  const [plan, setPlan] = useState('year');
  const [shouldContinouslyFetch, setShouldContinouslyFetch] = useState(false);
  const { data, isLoading: subscriptionsLoading, mutate: refreshSubscriptions } = useSWRHelper<{subscriptions: SubscriptionData[], paymentMethods: Stripe.PaymentMethod[]}>('/api/subscription');
  const { data: giftsReceived, isLoading: giftsLoading } = useSWRHelper<SubscriptionGiftData[]>('/api/subscription/gift');
  const { subscriptions, paymentMethods } = data || {};

  useEffect(() => {
    const confirmQueryString = window.location.search.includes('confirm=1');

    setShouldContinouslyFetch(confirmQueryString);
  }, []);
  const timesToFetch = useRef(5);

  useEffect(() => {
    if (shouldContinouslyFetch) {
      const interval = setInterval(() => {
        mutateUser();
        timesToFetch.current--;

        if (timesToFetch.current <= 0) {
          setShouldContinouslyFetch(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [mutateUser, shouldContinouslyFetch]);

  const [giftInterval, setGiftInterval] = useState<string>('month');
  const [giftQuantity, setGiftQuantity] = useState<number>(1);
  const [giftUserSelected, setGiftUserSelected] = useState<User>();

  //const paymentMethods = subscriptions?.map((subscriptionData) => subscriptionData.paymentMethod);
  const seenIds = new Set();

  const paymentMethodOptions = paymentMethods?.map((paymentMethod) => {
    if (seenIds.has(paymentMethod.id)) {
      return null;
    }

    seenIds.add(paymentMethod.id);

    return (
      <option key={paymentMethod.id} value={paymentMethod?.id}>{paymentMethod?.card?.brand} ending in {paymentMethod?.card?.last4}</option>
    );
  });

  const paymentMethodsDropdown = (
    <select
      className='border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent p-1 w-fit'
      id='paymentMethod'
      name='paymentMethod'
      defaultValue={paymentMethodOptions?.[0]?.props.value}
      onChange={(e) => {
        setPaymentMethod(e.target.value);
      }}
      style={{
        borderColor: 'var(--bg-color-4)',
      }}
    >
      <option value=''>Select a payment method</option>
      {paymentMethodOptions}
    </select>
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethodOptions?.[0]?.props.value);
  const hasAPaymentMethod = paymentMethods && paymentMethods?.length > 0;

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 ) {
      setPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods]);

  
  const subscribeButtonComponent = hasAPaymentMethod ?

    <div className='flex flex-col gap-2'>
      { paymentMethodsDropdown }
      <button
        className='bg-green-300 hover:bg-green-500 text-black font-bold py-2 px-4 rounded-3xl focus:outline-none focus:shadow-outline cursor-pointer w-full text-center'
        onClick={() => {
          if (!confirm(`Are you sure you want to subscribe to ${game.displayName} Pro? You will be billed ${plan}ly.`)) {
            return;
          }

          toast.dismiss();
          toast.loading('Upgrading to Pro...');

          const type = plan === 'month' ? ProSubscriptionType.Monthly : ProSubscriptionType.Yearly;

          fetch('/api/subscription/', {
            method: 'POST',
            body: JSON.stringify({
              type: type,
              paymentMethodId: paymentMethod,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(async (res) => {
            if (res.status === 200) {
              toast.success('Successfully upgraded to Pro!');
              refreshSubscriptions();
              mutateUser();
              setShouldContinouslyFetch(true);
            } else {
              console.error(res);
              const resp = await res.json();

              toast.error(resp.error, { duration: 3000 });
            }
          });
        }
        }
      >
              Add { game.displayName } Pro
      </button>

    </div>

    : (
      <Link
        className='bg-green-300 hover:bg-green-500 text-black font-bold py-2 px-4 rounded-3xl focus:outline-none focus:shadow-outline cursor-pointer w-full text-center'
        href={`${plan === 'year' ? stripePaymentYearlyLink : stripePaymentLink}?client_reference_id=${user?._id}&prefilled_email=${user?.email}`}
        rel='noreferrer'
        target='_blank'
      >
              Start Free Trial
      </Link>
    );
    

  return (
    <div className='flex flex-col justify-center items-center gap-6'>
      <div className='flex gap-4'>
        <Image alt='pro' src='/pro.svg' width='28' height='28' />
        <h1 className='font-bold text-3xl'>{game.displayName} Pro</h1>
      </div>
      {isPro(user) &&
        <div className='flex flex-col gap-4 text-center justify-center items-center'>
          <div>
            You have {game.displayName} Pro! Thank you for your support!
          </div>
          {hasAPaymentMethod && (
            <div className='flex flex-col sm:flex-row gap-4 items-center'>
              <div className='flex flex-col items-center gap-2'>
                <MultiSelectUser placeholder={`Gift ${game.displayName} Pro to user`} onSelect={setGiftUserSelected} />
                {paymentMethodsDropdown}
                <div className='flex gap-2 items-center'>
                  <select
                    className='border border-color-4 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent p-1 w-fit'
                    id='paymentMethod'
                    name='paymentMethod'
                    onChange={(e) => {
                      setGiftInterval(e.target.value);
                    }}
                    style={{
                      borderColor: 'var(--bg-color-4)',
                    }}
                  >
                    <option value={'month'}>Months</option>
                    <option value={'year'}>Years</option>
                  </select>
                  <input
                    className='text-center justify-center items-center h-6 p-0 w-10 border border-color-4 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent'
                    id='quantity'
                    max={24}
                    min={1}
                    name='quantity'
                    onChange={(e) => {
                      const val = Number(e.target.value);

                      setGiftQuantity(Math.min(Math.max(val, 1), 24));
                    }}
                    step='1'
                    type='number'
                    value={giftQuantity}
                  />
                </div>
              </div>
              <button
                className='bg-green-300 hover:bg-green-500 text-black font-bold py-2 px-4 rounded-2xl focus:outline-none focus:shadow-outline cursor-pointer w-fit h-fit text-center disabled:opacity-50 disabled:cursor-not-allowed'
                disabled={!giftUserSelected || !paymentMethod}
                onClick={() => {
                  if (!confirm(`Are you sure you want to gift ${game.displayName} Pro to ${giftUserSelected?.name}? You will be billed ${giftInterval}ly for ${giftQuantity} ${giftInterval}${giftQuantity === 1 ? '' : 's'}.`)) {
                    return;
                  }

                  toast.dismiss();
                  toast.loading('Gifting Pro...');

                  const type = giftInterval === 'month' ? 'gift_monthly' : 'gift_yearly';

                  fetch('/api/subscription/gift', {
                    method: 'POST',
                    body: JSON.stringify({
                      type: type,
                      quantity: giftQuantity,
                      paymentMethodId: paymentMethod,
                      giftTo: giftUserSelected?._id,
                    }),
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  }).then(async (res) => {
                    if (res.status === 200) {
                      toast.success('Successfully gifted Pro!');
                      refreshSubscriptions();
                    } else {
                      console.error(res);
                      const resp = await res.json();

                      toast.error(resp.error, { duration: 3000 });
                    }
                  });
                }
                }
              >
                <div className='flex flex-col'>
                  <span className='text-lg'>Gift Pro</span>
                  {giftInterval === 'month' ?
                    <span className='text-sm'>$4.99 USD / month</span>
                    :
                    <span className='text-sm'>$47.88 USD / year</span>
                  }
                </div>
              </button>
            </div>
          )}
        </div>
      }
      {giftsReceived && giftsReceived.length > 0 && (
        <div className='flex flex-wrap gap-4 text-center justify-center items-center'>
          {giftsReceived?.map((subscriptionData) =>
            <div key={subscriptionData.subscriptionId} className={classNames(
              'border rounded-md w-fit px-3 py-2',
            )}>
              <div className='font-bold'>Received Gifted Pro:</div>
              <div className='text-sm text-left'>
                <div className='flex gap-1 items-center'>Gifted From: <FormattedUser id={'subscription-' + subscriptionData.subscriptionId} user={subscriptionData.giftFromUser} /></div>
                <div>Status: <span className='font-bold'>{subscriptionData.cancel_at ? 'Ends ' + dayjs(new Date(subscriptionData.cancel_at * 1000)).format('MMMM DD, YYYY') : 'Active'}</span></div>
                {!subscriptionData.cancel_at && subscriptionData.current_period_end && (<div>Renews: {dayjs(new Date(subscriptionData.current_period_end * 1000)).format('MMMM DD, YYYY')}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
      {giftsLoading ? <LoadingSpinner /> : null}
      {hasAPaymentMethod && (
        <Link
          className='py-2.5 px-3.5 mt-2 inline-flex justify-center items-center gap-2 rounded-md border font-medium align-middle focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm whitespace-nowrap bg-green-100 dark:bg-gray-800 hover:bg-gray-50 hover:dark:bg-slate-600 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          href={stripeCustomerPortalLink || ''}
          rel='noreferrer'
          target='_blank'
        >
          Manage Billing
        </Link>
      )}
      {subscriptions && subscriptions.length > 0 && (
        <div className='flex flex-wrap gap-4 text-center justify-center items-center'>
          {subscriptions?.map((subscriptionData) =>
            <div key={subscriptionData.subscriptionId} className={classNames(
              'border rounded-md w-fit px-3 py-2',
              subscriptionData.cancel_at_period_end ? 'border-red-300' : 'border-green-300',
            )}>
              <div className='font-bold'>{subscriptionData.planName}</div>
              <div className='text-sm text-left'>
                {subscriptionData.giftToUser && (
                  <div className='flex gap-1 items-center'>
                    Gifted to: <FormattedUser id={'subscription-' + subscriptionData.subscriptionId} user={subscriptionData.giftToUser} /></div>
                )}
                {!subscriptionData.cancel_at_period_end && subscriptionData.current_period_end && (
                  <div>
                    {subscriptionData.status === 'trialing' ? (
                      <span className='text-lg'>Trial Ends: <span className='font-bold'>{dayjs(new Date(subscriptionData.current_period_end * 1000)).format('MMMM DD, YYYY')}</span></span>
                    ) : (
                      <span className='text-lg'>Renews: <span className='font-bold'>{dayjs(new Date(subscriptionData.current_period_end * 1000)).format('MMMM DD, YYYY')}</span></span>
                    )}
                  </div>
                )}
                <div>Status: <span className='font-bold'>{subscriptionData.cancel_at ? 'Ends ' + dayjs(new Date(subscriptionData.cancel_at * 1000)).format('MMMM DD, YYYY') : 'Active'}</span></div>
                <div>Card Used: {subscriptionData.paymentMethod?.card ? `${subscriptionData.paymentMethod.card.brand} ending in ${subscriptionData.paymentMethod.card.last4}` : 'Not found'}</div>
                {subscriptionData.cancel_at_period_end &&
                  <span className='font-bold'>
                    Subscription will cancel at period end
                  </span>
                }
              </div>
            </div>
          )}
        </div>
      )}
      {subscriptionsLoading ? <LoadingSpinner /> : null}
      {user !== undefined && !isPro(user) &&
        <div className='flex flex-col items-center justify-center gap-4'>
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
                      }}>SAVE 20%</span>
                    </div>
                    <span className='font-bold text-lg' style={{ color: 'var(--color)' }}>$3.99 USD / month</span>
                    <span className='text-xs'>$47.88 per year billed annually</span>
                    <span className='text-lg text-center font-bold'>7-day Free Trial</span>
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
                    <span className='font-bold text-lg' style={{ color: 'var(--color)' }}>$4.99 USD / month</span>
                    <span className='text-xs'>Billed monthly</span>
                    <span className='text-lg text-center font-bold'>7-day Free Trial</span>
                  </div>
                )}
              </RadioGroup.Option>
            </RadioGroup>
            { subscribeButtonComponent}
          </div>
          <p className='text-xs text-center'>
              By clicking Subscribe, you agree to our <a className='text-blue-300' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>
                Terms of Service
            </a>.<br />Subscriptions auto-renew until canceled, as described in the Terms.
          </p>
        </div>
      }
      <div className='text-xs'>
        For questions please contact <Link className='text-blue-300' href='mailto:help@thinky.gg'>help@thinky.gg</Link>.
      </div>
      <div className='flex flex-col xl:flex-row items-center gap-4 justify-center'>
        <div className='p-2'>
          <video autoPlay loop muted playsInline className='rounded-xl'>
            <source src='https://i.imgur.com/HzFhvYY.mp4' type='video/mp4' />
          </video>
        </div>
        <div className='flex flex-col items-left gap-4'>
        <ProFeature
            description='Easily navigate through your moves with a timeline scrubber'
            icon={
              <Spline className='w-6 h-6' />
            }
            title='Timeline Scrubber'
          />
          <ProFeature
            description='Redo your moves in the game'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' viewBox='0 0 16 16'>
                <path fillRule='evenodd' d='M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z' />
                <path d='M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z' />
              </svg>}
            title='Redo'
          />
          <ProFeature
            description='Save solutions and game states for each level'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(239 68 68)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5' />
              </svg>
            }
            title='Checkpoints'
          />
          <ProFeature
            description='View all completions, all difficulties, and analyze your play time'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(34 197 94)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' />
              </svg>
            }
            title='Extra Level Stats'
          />
          <ProFeature
            description='Create collections only viewable by you'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' />
              </svg>
            }
            title='Private Collections'
          />
          <ProFeature
            description='Search by block type, level dimensions, difficulty types, and more'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
              </svg>
            }
            title='Advanced Search Filters'
          />
          <ProFeature
            description='Details on levels solved per user and per creator'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='rgb(234 179 8)' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' />
              </svg>
            }
            title='User Insights'
          />
          <ProFeature
            description='View your play history'
            icon={
              <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='w-6 h-6' viewBox='0 0 16 16'>
                <path d='M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z' />
                <path d='M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z' />
                <path d='M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z' />
              </svg>}
            title='Play History'
          />
   
          <ProFeature
            description='Displayed next to your username across the site'
            icon={<Image alt='pro' src='/pro.svg' width='24' height='24' />}
            title='Pro Badge'
          />
          <span className='text-sm ml-12'><Link className='underline' href={'https://github.com/sspenst/thinky.gg/wiki/Pro-Features'}>View full list</Link> of Pro Features</span>
        </div>
      </div>
    </div>
  );
}
