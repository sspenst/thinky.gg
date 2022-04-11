import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LoginForm from '../../components/loginForm';
import Page from '../../components/page';
import { useRouter } from 'next/router';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/checkToken', { credentials: 'include' }).then(res => {
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
        <div
          style={{
            margin: '0 auto',
            display: 'table',
          }}
        >
          {'New to Pathology? '}
          <Link href='/signup' passHref>
            <a className='underline'>
              Sign Up
            </a>
          </Link>
        </div>
      </>
    </Page>
  );
}