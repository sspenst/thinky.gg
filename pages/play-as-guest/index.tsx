import Page from '@root/components/page';
import { AppContext } from '@root/contexts/appContext';
import redirectToHome from '@root/helpers/redirectToHome';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await redirectToHome(context);

  if (redirect.redirect) {
    return redirect;
  }

  return {
    props: {
      recaptchaPublicKey: process.env.RECAPTCHA_PUBLIC_KEY || '',
    },
  };
}

export default function PlayAsGuest({ recaptchaPublicKey }: {recaptchaPublicKey?: string}) {
  const [registrationState, setRegistrationState] = useState('registering');
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const { cache } = useSWRConfig();
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);

  function onRecaptchaChange(value: string | null) {
    if (value) {
      setRecaptchaToken(value);
    }
  }

  const text = registrationState === 'registered' ? <div >Redirecting...</div> : <div className='text-lg'>
    <div className='text-center'>
      <span className='block text-lg font-medium mb-4'>Create guest account</span>
      <ul className='text-left list-disc pl-6'>
        <li className='mb-2'>Your progress is saved and you can convert to a regular account via account settings</li>
        <li className='mb-2'>You aren&apos;t able to comment or review levels as a guest</li>
        <li className='mb-2'>While your progress is saved, advanced data around your play is not saved.</li>
        <li className='mb-2'>Your guest account may be deleted after 7 days of no activity</li>
      </ul>
    </div>

    <div className='w-full pt-2 justify-center flex'>
      <ReCAPTCHA
        onChange={onRecaptchaChange}

        ref={recaptchaRef}
        sitekey={recaptchaPublicKey ?? ''}
      />
    </div>
    <div className='p-3 text-center flex flex-col gap-3'>
      <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' onClick={fetchSignup}>
        Create
      </button>
      <Link className='text-sm underline' href='/signup'>Create (free) regular account</Link>
    </div>
  </div>;

  async function fetchSignup() {
    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';

    toast.dismiss();
    toast.loading('Creating guest account...');
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',

      body: JSON.stringify({
        name: 'Guest',
        email: 'guest@guest.com',
        password: 'guest-account',
        recaptchaToken: recaptchaToken,
        guest: true,
        tutorialCompletedAt: tutorialCompletedAt
      })
    });

    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }

    if (!res.ok) {
      toast.dismiss();
      toast.error('Error creating guest account');
    }

    if (res.status === 200) {
      // clear cache
      for (const key of cache.keys()) {
        cache.delete(key);
      }

      toast.dismiss();
      toast.success('Guest account created');
      setRegistrationState('registered');
      // clear localstorage value
      window.localStorage.removeItem('tutorialCompletedAt');
      mutateUser();
      setShouldAttemptAuth(true);
      sessionStorage.clear();

      if (tutorialCompletedAt !== '0') {
        router.push('/play');
      } else {
        router.push('/tutorial');
      }
    }
  }

  return (
    <Page
      title='Play as Guest'
    >
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-2xl font-bold mb-6'>
            Play as Guest
        </h1>
        <div>
          {text}
        </div>
      </div>

    </Page>
  );
}
