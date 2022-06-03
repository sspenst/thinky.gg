import React, { useContext, useState } from 'react';
import { PageContext } from '../contexts/pageContext';
import { useRouter } from 'next/router';

interface ResetPasswordFormProps {
  token: string;
  userId: string;
}

export default function ResetPasswordForm({ token, userId }: ResetPasswordFormProps) {
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const router = useRouter();
  const { windowSize } = useContext(PageContext);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password !== password2) {
      alert('Password does not match');

      return;
    }

    fetch('/api/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        password: password,
        token: token,
        userId: userId,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        router.replace('/login');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error resetting password');
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
        <button className='underline' type='submit'>Reset password</button>
      </div>
    </form>
  );
}
