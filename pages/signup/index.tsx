/* istanbul ignore file */

import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Page from '../../components/page';
import SignupForm from '../../components/signupForm';

export default function SignUp() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/check-token', { credentials: 'include' }).then(res => {
      if (res.status === 200) {
        router.replace('/');
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error retrieving token');
      setLoading(false);
    });
  }, [router]);

  return (loading ? null :
    <Page title={'Sign Up'}>
      <>
        <SignupForm />
        <div
          style={{
            margin: '0 auto',
            display: 'table',
          }}
        >
          {'Already have an account? '}
          <Link href='/login' passHref>
            <a className='underline'>
              Log In
            </a>
          </Link>
        </div>

        <div className='p-6  text-center text-sm'
          style={{

          }}
        >
          {'For Psychopath 2 users signing up on Pathology: If your email was public on the old site you may get a password reset link when you use the same email to sign up. If your email wasn\'t public or you\'re having any issues signing up, send @sspenst a message on the '}
          <a
            className='underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          {' and we can merge your accounts manually.'}
        </div>
      </>
    </Page>
  );
}
