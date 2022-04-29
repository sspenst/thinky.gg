import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState<string>('');
  const [isSent, setIsSent] = useState(false);
  const { setIsLoading } = useContext(AppContext);
  const { windowSize } = useContext(PageContext);
  
  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsLoading(true);

    fetch('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 200) {
        setIsSent(true);
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error resetting password');
    });
  }

  return (
    <>
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
          <button className='underline' type='submit'>Reset password</button>
        </div>
      </form>
      {isSent ?
        <div
          style={{
            display: 'table',
            margin: '0 auto',
          }}
        >
          Email sent!
        </div>
      : null}
    </>
  );
}
