import React, { useContext, useState } from 'react';

import Link from 'next/link';
import { PageContext } from '../contexts/pageContext';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

export default function LoginForm() {
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();
  const { windowSize } = useContext(PageContext);
  const [ error_message, setError_message ] = useState<string>('');

  function onSubmit(event: React.FormEvent) {
    toast.dismiss();
    toast.loading('Logging in');
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
    }).then(res => {
      if (res.status === 200) {
        toast.dismiss();
        toast.success('Logged in');
        router.push('/');
      } else {
        throw res.text();
      }
    }).catch(err => {
      toast.dismiss();
      toast.error('Could not log in. Please try again');
    });
  }

  // vertical center
  return (

    <div className="w-full max-w-xs mx-auto p-3 py-12">
      <form className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4 ">
          <label className="block text-gray-700 text-sm font-bold mb-2 " htmlFor="username">
        Username
          </label>
          <input onChange={e => setName(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="username" type="text" placeholder="Username"/>
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
        Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" placeholder="******************"/>
          <p className="text-red-500 text-xs italic">{error_message}</p>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onSubmit} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
        Sign In
          </button>
          <Link href="/forgot-password">
            <a className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">Forgot Password?</a>
          </Link>
        </div>
      </form>
      <p className="text-center text-gray-500 text-xs">
        Hang out in our <Link href='https://discord.gg/NsN8SBEZGN'><a className='underline'>Discord server</a></Link>
      </p>
    </div>
  );
/*

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
      </div>
      <div
        style={{
          display: 'table',
          margin: '0 auto',
        }}
      >
        <button className='underline' type='submit'>Log In</button>
      </div>
    </form>
  )
  */
}
