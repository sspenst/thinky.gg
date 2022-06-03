import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import { useRouter } from 'next/router';

export default function SignupForm() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== password2) {
      alert('Password does not match');

      return;
    }

    setIsLoading(true);

    fetch('/api/signup', {
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
    }).then(async res => {
      if (res.status === 200) {
        const resObj = await res.json();

        if (resObj.sentMessage) {
          alert('An account with this email already exists! Please check your email to set your password.');
        } else {
          router.push('/');
        }
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error signing up please try again');
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        width: windowSize.width,
      }}
    >
      <div
        style={{
          display: 'table',
          margin: '0 auto',
        }}
      >
        <div>
          <input
            type='email'
            name='email'
            placeholder='Enter email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ color: 'rgb(0, 0, 0)' }}
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
            style={{ color: 'rgb(0, 0, 0)' }}
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
            style={{ color: 'rgb(0, 0, 0)' }}
            required
          />
        </div>
        <div>
          <input
            type='password'
            name='password2'
            placeholder='Re-enter password'
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            style={{ color: 'rgb(0, 0, 0)' }}
            required
          />
        </div>
      </div>
      <div
        style={{
          display: 'table',
          margin: '0 auto',
        }}
      >
        <button className='underline' type='submit'>Sign Up</button>
      </div>
    </form>
  );
}
