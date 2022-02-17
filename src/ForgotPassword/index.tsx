import React, { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState<string>('');

  function onSubmit() {
    alert('submit');
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Forgot password</h1>
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
      <input type='submit' value='Submit'/>
    </form>
  );
}