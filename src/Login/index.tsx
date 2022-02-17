import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  function onSubmit() {
    alert('submit');
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Login</h1>
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
      <input type='submit' value='Submit'/>
    </form>
  );
}