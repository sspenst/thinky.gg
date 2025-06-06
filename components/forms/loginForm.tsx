import { blueButton } from '@root/helpers/className';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { AppContext } from '../../contexts/appContext';
import FormTemplate from './formTemplate';

export default function LoginForm() {
  const { cache } = useSWRConfig();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter();

  // Feature flag for OAuth providers
  const isOAuthEnabled = useFeatureFlagEnabled('oauth-providers');

  // Handle OAuth login success/error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const discordLogin = urlParams.get('discord_login');
    const googleLogin = urlParams.get('google_login');
    const discordError = urlParams.get('discord_error');
    const googleError = urlParams.get('google_error');

    if (discordLogin === 'success' || googleLogin === 'success') {
      const provider = discordLogin === 'success' ? 'Discord' : 'Google';

      toast.success(`Logged in with ${provider}!`);

      // Clear cache and update user state
      for (const key of cache.keys()) {
        cache.delete(key);
      }

      mutateUser();
      setShouldAttemptAuth(true);
      sessionStorage.clear();

      // Check for redirect URL stored before OAuth
      const storedRedirect = sessionStorage.getItem('oauth_redirect');

      if (storedRedirect && storedRedirect !== 'undefined') {
        sessionStorage.removeItem('oauth_redirect');
        const endPath = storedRedirect.split('/').pop();

        router.push('/' + (endPath ?? '/'));
      } else {
        router.push('/');
      }
    } else if (discordError === 'true') {
      toast.error('Failed to login with Discord. Please try again.');
    } else if (googleError === 'true') {
      toast.error('Failed to login with Google. Please try again.');
    }

    // Clean up URL parameters
    if (discordLogin || googleLogin || discordError || googleError) {
      const newUrl = window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }
  }, [cache, mutateUser, setShouldAttemptAuth, router]);

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

        // clear cache
        for (const key of cache.keys()) {
          cache.delete(key);
        }

        mutateUser();
        setShouldAttemptAuth(true);
        sessionStorage.clear();
        // check if we have a redirect url as query param
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');

        if (redirectUrl && redirectUrl !== 'undefined') {
          // Split the URL into subdomain and path
          const endPath = redirectUrl.split('/').pop();

          router.push('/' + (endPath ?? '/'));
        } else {
          router.push('/');
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      try {
        setErrorMessage(JSON.parse(await err)?.error);
      } catch {
        console.error(err);
      } finally {
        toast.dismiss();
        toast.error('Could not log in. Please try again');
      }
    });
  }

  function handleOAuthLogin(provider: 'discord' | 'google') {
    // Store redirect URL in session storage for after OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');

    if (redirectUrl && redirectUrl !== 'undefined') {
      sessionStorage.setItem('oauth_redirect', redirectUrl);
    }

    window.location.href = `/api/auth/${provider}`;
  }

  return (
    <FormTemplate title='Log in with your Thinky.gg account'>
      <div className='flex flex-col gap-6'>
        {/* OAuth Login Buttons - only show if feature flag is enabled */}
        {isOAuthEnabled && (
          <>
            <div className='space-y-3'>
              <button
                onClick={() => handleOAuthLogin('discord')}
                className='w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2'
                type='button'
              >
                <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                </svg>
                Continue with Discord
              </button>
              <button
                onClick={() => handleOAuthLogin('google')}
                className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600'
                type='button'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                  <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                  <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                  <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                </svg>
                Continue with Google
              </button>
            </div>
            {/* Divider */}
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600' />
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'>Or continue with email</span>
              </div>
            </div>
          </>
        )}
        {/* Traditional Login Form */}
        <form className='flex flex-col gap-6' onSubmit={onSubmit}>
          <div>
            <label className='block text-sm font-medium mb-2' htmlFor='username'>Username or Email</label>
            <input required onChange={e => setName(e.target.value)} className='w-full' id='username' type='text' placeholder='Username or Email' />
          </div>
          <div>
            <div className='flex justify-between gap-2 flex-wrap mb-2'>
              <label className='text-sm font-medium' htmlFor='password'>Password</label>
              <Link
                className='font-medium text-sm text-blue-500 hover:text-blue-400'
                href='/forgot-password'
              >
                Forgot your password?
              </Link>
            </div>
            <input required onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
          </div>
          <button className={classNames(blueButton, 'w-full')} type='submit'>Log in</button>
          {errorMessage &&
            <div className='text-red-500 text-sm text-center'>
              {errorMessage}
            </div>
          }
        </form>
        <div className='text-center text-sm'>
          <span>
            {'New to Thinky.gg? '}
          </span>
          <Link
            className='font-medium text-sm text-blue-500 hover:text-blue-400'
            href='/signup'
          >
            Sign up
          </Link>
        </div>
      </div>
    </FormTemplate>
  );
}
