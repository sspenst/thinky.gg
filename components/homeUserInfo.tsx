import Link from 'next/link';
import React, { useContext } from 'react';
import Dimensions from '../constants/dimensions';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import getProfileSlug from '../helpers/getProfileSlug';
import Avatar from './avatar';

interface OnboardStep {
  isComplete: boolean;
  text: JSX.Element;
}

export default function HomeUserInfo() {
  const { setIsLoading } = useContext(AppContext);
  const { user, userConfig } = useContext(PageContext);

  const onboardSteps: OnboardStep[] = [
    {
      isComplete: true,
      text: <span>Create an account</span>,
    },
    {
      isComplete: !!userConfig?.tutorialCompletedAt,
      text: <Link className='underline' href='/tutorial'>Complete the tutorial</Link>,
    },
    {
      isComplete: !!user?.avatarUpdatedAt,
      text: <Link className='underline' href='/settings'>Set an avatar</Link>,
    },
  ];

  return (<div className='flex flex-col gap-4 m-4'>
    {user &&
      <div className='flex justify-center gap-4'>
        <div className='flex flex-col gap-2'>
          <Link href={getProfileSlug(user)} passHref>
            <Avatar hideStatusCircle={true} size={Dimensions.AvatarSizeLarge} user={user} />
          </Link>
          {/* <div className='flex justify-center gap-1'>
            {user?.score}
            <span
              className='font-bold'
              style={{
                color: 'var(--color-complete)',
              }}
            >
              ✓
            </span>
          </div> */}
        </div>
        <div className='flex flex-col gap-2'>
          <span className='font-bold text-2xl'>Welcome, {user.name}</span>
          {onboardSteps.map(onboardStep =>
            <div className='flex flex-row gap-2 items-center' key={`onboardstep-${onboardStep.text}`}>
              {onboardStep.isComplete ?
                <div className='rounded-full bg-green-500 border w-min' style={{
                  borderColor: 'var(--bg-color-4)',
                }}>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M9 12.75L11.25 15 15 9.75M21 12' />
                  </svg>
                </div>
                :
                <div className='rounded-full bg-neutral-500 border w-min' style={{
                  borderColor: 'var(--bg-color-4)',
                }}>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M16 12H8' />
                  </svg>
                </div>
              }
              <div className='italic'>{onboardStep.text}</div>
            </div>
          )}
        </div>
      </div>
    }
    <div className='flex flex-col items-center'>
      <Link
        className='inline-block px-3 py-1.5 border-4 border-neutral-400 bg-white text-black font-bold text-3xl leading-snug rounded-xl hover:ring-4 hover:bg-blue-500 hover:text-white ring-blue-500/50 focus:ring-0'
        style={{
          animationDelay: '0.5s',
        }}
        data-mdb-ripple='true'
        data-mdb-ripple-color='light'
        href={userConfig?.tutorialCompletedAt ? '/campaign/pathology' : '/tutorial'}
        onClick={() => {
          if (userConfig?.tutorialCompletedAt) {
            setIsLoading(true);
          }
        }}
        role='button'
      >
        {userConfig?.tutorialCompletedAt ? 'Play' : 'Start'}
      </Link>
    </div>
  </div>);
}
