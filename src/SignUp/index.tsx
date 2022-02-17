import React, { useState } from 'react';

export default function SignUp() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  function onSubmit() {
    alert('submit');
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Sign up</h1>
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
      <div>
        <input
          type='password'
          name='password2'
          placeholder='Re-enter password'
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          style={{color: 'rgb(0, 0, 0)'}}
          required
        />
      </div>
      <input type='submit' value='Submit'/>
    </form>
  );
}