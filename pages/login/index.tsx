import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Page from '../../components/page';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/checkToken', { credentials: 'include' }).then(res => {
      if (res.status === 200) {
        router.push('/');
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 200) {
        router.push('/');
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error logging in please try again');
    });
  }

  return (loading ? null :
    <Page title={'Log In'}>
      <>
        <form onSubmit={onSubmit}>
          <div>
            <input
              type='email'
              name='email'
              placeholder='Enter email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{color: 'rgb(0, 0, 0)'}}
              required
            />
          </div>
          <div>
            <input
              type='password'
              name='password'
              placeholder='Enter password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{color: 'rgb(0, 0, 0)'}}
              required
            />
          </div>
          <button type='submit'>LOG IN</button>
        </form>
        <div><Link href='/signup'>SIGN UP</Link></div>
      </>
    </Page>
  );
}