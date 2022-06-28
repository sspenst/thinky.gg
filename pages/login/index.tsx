import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LoginForm from '../../components/loginForm';
import Page from '../../components/page';
import { useRouter } from 'next/router';

export default function Login() {
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
      setLoading(false);
    });
  }, [router]);

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
