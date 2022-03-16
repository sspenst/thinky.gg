import React, { useContext, useState } from 'react';
import { WindowSizeContext } from './windowSizeContext';
import { useRouter } from 'next/router';

export default function LoginForm() {
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const windowSize = useContext(WindowSizeContext);
  
  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        name: name,
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
            type='text'
            name='name'
            placeholder='Enter username'
            value={name}
            onChange={e => setName(e.target.value)}
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
      </div>
      <div
        style={{
          display: 'table',
          margin: '0 auto',
        }}
      >
        <button className='underline' type='submit'>LOG IN</button>
      </div>
    </form>
  );
}
