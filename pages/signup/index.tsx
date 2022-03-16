import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Page from '../../components/page';
import SignupForm from '../../components/signupForm';
import { useRouter } from 'next/router';

export default function SignUp() {
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
    <Page
      hideUserInfo={true}
      title={'Sign Up'}
    >
      <>
      <SignupForm/>
        <div
          style={{
            margin: '0 auto',
            display: 'table',
          }}
        >
          {'Already have an account? '}
          <Link href='/login' passHref>
            <button className='underline'>
              LOG IN
            </button>
          </Link>
        </div>
      </>
    </Page>
  );
}