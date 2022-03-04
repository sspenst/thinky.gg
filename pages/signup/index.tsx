import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Page from '../../components/Common/Page';

export default function SignUp() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  // const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const [username, setUsername] = useState<string>('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'signup', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        name: username,
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

  return (
    <Page needsAuth={false} title={'Sign Up'}>
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
            type='text'
            name='username'
            placeholder='Enter username'
            value={username}
            onChange={e => setUsername(e.target.value)}
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
        {/* <div>
          <input
            type='password'
            name='password2'
            placeholder='Re-enter password'
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            style={{color: 'rgb(0, 0, 0)'}}
            required
          />
        </div> */}
        <button type='submit'>SIGN UP</button>
      </form>
    </Page>
  );
}