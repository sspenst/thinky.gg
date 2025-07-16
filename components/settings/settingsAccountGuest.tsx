import { useRouter } from 'next/router';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SettingsAccountGuest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [username, setUsername] = useState('');

  async function fetchSignup() {
    toast.dismiss();
    toast.loading('Creating account...');

    fetch('/api/guest-convert', {
      method: 'PUT',
      body: JSON.stringify({
        name: username,
        email: email,
        password: password,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(async(res) => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Account created');
        router.push('/confirm-email');
      }
    }).catch(async err => {
      const error = await err;

      console.error(error);
      toast.dismiss();

      let errorStr = 'Error creating account';

      try {
        errorStr = JSON.parse(error).error;
      } catch {
        if (typeof error === 'string') {
          errorStr = error;
        }
      }

      toast.error(errorStr, { duration: 3000 });
    });
  }

  return (
    <div className='w-full max-w-md mx-auto'>
      {/* Header */}
      <div className='flex items-center mb-6'>
        <div className='w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mr-3'>
          <svg className='w-5 h-5 text-amber-600 dark:text-amber-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
          </svg>
        </div>
        <div>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Convert Guest Account</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Create a permanent account to save your progress</p>
        </div>
      </div>
      {/* Info Card */}
      <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6'>
        <div className='flex items-start space-x-3'>
          <div className='flex-shrink-0'>
            <svg className='w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
          </div>
          <div>
            <p className='text-sm text-amber-800 dark:text-amber-200'>
              <span className='font-semibold'>You&apos;re currently using a guest account.</span>
            </p>
            <p className='text-sm text-amber-700 dark:text-amber-300 mt-1'>
              Convert to a regular account (free) to secure your progress and access all features.
            </p>
          </div>
        </div>
      </div>
      {/* Benefits List */}
      <div className='mb-6 pb-6 border-b border-gray-200 dark:border-gray-700'>
        <h3 className='text-sm font-medium text-gray-900 dark:text-white mb-3'>Benefits of converting:</h3>
        <ul className='space-y-2 text-sm text-gray-600 dark:text-gray-400'>
          <li className='flex items-center space-x-2'>
            <svg className='w-4 h-4 text-green-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
            <span>Permanent account that won&apos;t be lost</span>
          </li>
          <li className='flex items-center space-x-2'>
            <svg className='w-4 h-4 text-green-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
            <span>Access from any device</span>
          </li>
          <li className='flex items-center space-x-2'>
            <svg className='w-4 h-4 text-green-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
            <span>Email notifications and updates</span>
          </li>
          <li className='flex items-center space-x-2'>
            <svg className='w-4 h-4 text-green-500 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
            <span>Full profile customization</span>
          </li>
        </ul>
      </div>
      {/* Conversion Form */}
      <form className='space-y-4' onSubmit={(e) => { e.preventDefault(); fetchSignup(); }}>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor='guestUsername'>
            Choose a Username
          </label>
          <input
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
            id='guestUsername'
            placeholder='Enter your desired username'
            type='text'
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor='guestEmail'>
            Email Address
          </label>
          <input
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
            id='guestEmail'
            placeholder='Enter your email address'
            type='email'
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor='guestPassword'>
            Create Password
          </label>
          <input
            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors'
            id='guestPassword'
            placeholder='Create a secure password'
            type='password'
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Must be at least 8 characters long
          </p>
        </div>
        <button
          className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
          type='submit'
          disabled={!username || !email || !password}
        >
          Convert to Regular Account
        </button>
      </form>
    </div>
  );
}
