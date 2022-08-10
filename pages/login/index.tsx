import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';
import LoginForm from '../../components/loginForm';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setShouldAttemptAuth } = useContext(AppContext);

  useEffect(() => {
    fetch('/api/check-token', { credentials: 'include' }).then(res => {
      if (res.status === 200) {
        setShouldAttemptAuth(true);
        router.replace('/');
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [router, setShouldAttemptAuth]);

  return (loading ? null :
    <Page title={'Log In'}>
      <>
        <LoginForm/>
        <div className='text-center text-xs mb-4' style={{ color: 'var(--bg-color-4)' }}>
          {'Hang out in our '}
          <Link href='https://discord.gg/NsN8SBEZGN'>
            <a className='underline'>
              Discord server
            </a>
          </Link>
        </div>
        <div className='text-center mb-4'>
          {'New to Pathology? '}
          <Link href='/signup' passHref>
            <a className='underline'>
              Sign Up
            </a>
          </Link>
          <br/>
        </div>
      </>
    </Page>
  );
}
