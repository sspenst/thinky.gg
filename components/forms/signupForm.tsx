import { TERMS_OF_SERVICE_URL } from '@root/constants/externalLinks';
import { blueButton } from '@root/helpers/className';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import StepWizard, { StepWizardChildProps, StepWizardProps } from 'react-step-wizard';
import { useSWRConfig } from 'swr';
import { debounce } from 'throttle-debounce';
import { AppContext } from '../../contexts/appContext';
import LoadingSpinner from '../page/loadingSpinner';
import FormTemplate from './formTemplate';

interface SignupFormProps {
  recaptchaPublicKey: string | null;
}

export default function SignupForm({ recaptchaPublicKey }: SignupFormProps) {
  const { cache } = useSWRConfig();
  const [email, setEmail] = useState<string>('');
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const [password, setPassword] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();
  const [showRecaptcha, setShowRecaptcha] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [oauthData, setOauthData] = useState<{
    provider: 'discord' | 'google';
    discordId?: string;
    discordUsername?: string;
    discordEmail?: string;
    discordAvatarHash?: string;
    access_token?: string;
    refresh_token?: string;
    googleId?: string;
    googleUsername?: string;
    googleEmail?: string;
    googleAvatarUrl?: string;
  } | null>(null);

  const [isValidUsername, setIsValidUsername] = useState<boolean>(false);
  const [wizard, setWizard] = useState<StepWizardProps>();
  const [usernameExists, setUsernameExists] = useState<boolean>(false);
  const [isExistsLoading, setIsExistsLoading] = useState<boolean>(false);

  const checkUsername = async (username: string) => {
    const res = await fetch(`/api/user/exists?name=${username}`);
    const resObj = await res.json();

    setIsExistsLoading(false);
    setUsernameExists(resObj.exists);
  };

  // debounce the checkUsername function
  const debouncedCheckUsername = useRef(
    debounce(500, checkUsername)
  ).current;

  // check if username is valid - wrapped in useCallback to avoid dependency issues
  const validateUsername = useCallback((newUserName: string) => {
    let valid = true;

    if (newUserName.length < 3 || newUserName.length > 50 || !newUserName.match(/^[a-zA-Z0-9][-a-zA-Z0-9_.]*$/)) {
      valid = false;
    }

    setIsValidUsername(valid);

    if (!valid) {
      setIsExistsLoading(false);

      return;
    }

    setIsExistsLoading(true);
    debouncedCheckUsername(newUserName);
  }, [debouncedCheckUsername]);

  // Handle OAuth temporary data from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const discordTemp = urlParams.get('discord_temp');
    const googleTemp = urlParams.get('google_temp');

    if (discordTemp) {
      try {
        const data = JSON.parse(decodeURIComponent(discordTemp));

        setOauthData({ provider: 'discord', ...data });
        // Clean username by removing leading periods and other invalid starting characters
        const username = (data.discordUsername || '').replace(/^[^a-zA-Z0-9]+/, '') || `user${Date.now()}`;

        setUsername(username);
        setEmail(data.discordEmail || '');

        // Trigger username validation for the pre-filled username
        if (username) {
          validateUsername(username);
        }

        toast.success('Complete your signup with Discord account connected!');
      } catch (e) {
        console.error('Failed to parse Discord temp data:', e);
      }
    } else if (googleTemp) {
      try {
        const data = JSON.parse(decodeURIComponent(googleTemp));

        setOauthData({ provider: 'google', ...data });
        // Clean username by removing leading periods and other invalid starting characters
        const username = (data.googleUsername || '').replace(/^[^a-zA-Z0-9]+/, '') || `user${Date.now()}`;

        setUsername(username);
        setEmail(data.googleEmail || '');

        // Trigger username validation for the pre-filled username
        if (username) {
          validateUsername(username);
        }

        toast.success('Complete your signup with Google account connected!');
      } catch (e) {
        console.error('Failed to parse Google temp data:', e);
      }
    }

    // Clean up URL parameters
    if (discordTemp || googleTemp) {
      const newUrl = window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }
  }, [validateUsername]);

  function onSubmit(recaptchaToken: string | null) {
    // Only require password validation for non-OAuth signups
    if (!oauthData && (password.length < 8 || password.length > 50)) {
      toast.dismiss();
      toast.error('Password must be between 8 and 50 characters');

      return;
    }

    if (recaptchaPublicKey) {
      if (!showRecaptcha) {
        setShowRecaptcha(true);

        return;
      }

      if (!recaptchaToken) {
        toast.error('Please complete the recaptcha');

        return;
      }

      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    }

    toast.dismiss();
    toast.loading('Registering...');

    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';
    const utm_source = window.localStorage.getItem('utm_source') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      email: email,
      name: username,
      // For OAuth signups, we'll let the backend generate a random password
      password: oauthData ? 'oauth-generated' : password,
      tutorialCompletedAt: parseInt(tutorialCompletedAt),
      utm_source: utm_source
    };

    if (recaptchaToken) {
      body.recaptchaToken = recaptchaToken;
    }

    // Include OAuth data if present
    if (oauthData) {
      body.oauthData = oauthData;
    }

    fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify(body),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async res => {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }

      if (res.status === 200) {
        const resObj = await res.json();

        if (resObj.sentMessage) {
          toast.dismiss();
          toast.error('An account with this email already exists! Please check your email to set your password.');
        } else {
          // clear cache
          for (const key of cache.keys()) {
            cache.delete(key);
          }

          toast.dismiss();

          if (oauthData) {
            toast.success(`Registered with ${oauthData.provider === 'discord' ? 'Discord' : 'Google'}! Welcome to Thinky.gg!`);
          } else {
            toast.success('Registered! Please confirm your email.');
          }

          // clear localstorage value
          window.localStorage.removeItem('tutorialCompletedAt');
          mutateUser();
          setShouldAttemptAuth(true);
          sessionStorage.clear();

          // For OAuth users, skip email confirmation if their email is verified by the provider
          if (oauthData) {
            router.push('/');
          } else {
            router.push('/confirm-email');
          }
        }
      } else {
        throw res.text();
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error);
    });
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserName = e.target.value;

    setUsername(newUserName);
    validateUsername(newUserName);
  };

  function handleOAuthSignup(provider: 'discord' | 'google') {
    // Store redirect URL in session storage for after OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');

    if (redirectUrl && redirectUrl !== 'undefined') {
      sessionStorage.setItem('oauth_redirect', redirectUrl);
    }

    window.location.href = `/api/auth/${provider}`;
  }

  return (
    <FormTemplate title='Create your Thinky.gg account'>
      <div className='flex flex-col gap-6'>
        {/* Show OAuth buttons only if not already processing OAuth data */}
        {!oauthData && (
          <>
            {/* OAuth Signup Buttons */}
            <div className='space-y-3'>
              <button
                onClick={() => handleOAuthSignup('discord')}
                className='w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2'
                type='button'
              >
                <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                </svg>
                Sign up with Discord
              </button>
              <button
                onClick={() => handleOAuthSignup('google')}
                className='w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white dark:border-gray-600'
                type='button'
              >
                <svg className='w-5 h-5' viewBox='0 0 24 24'>
                  <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                  <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                  <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                  <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                </svg>
                Sign up with Google
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
        {/* Show OAuth provider info if processing OAuth signup */}
        {oauthData && (
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center'>
                {oauthData.provider === 'discord' ? (
                  <svg className='w-4 h-4 text-blue-600 dark:text-blue-400' fill='currentColor' viewBox='0 0 24 24'>
                    <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
                  </svg>
                ) : (
                  <svg className='w-4 h-4 text-blue-600 dark:text-blue-400' viewBox='0 0 24 24'>
                    <path fill='currentColor' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                    <path fill='currentColor' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                    <path fill='currentColor' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                    <path fill='currentColor' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                  </svg>
                )}
              </div>
              <div>
                <p className='text-sm font-medium text-blue-900 dark:text-blue-100'>
                  Signing up with {oauthData.provider === 'discord' ? 'Discord' : 'Google'}
                </p>
                <p className='text-xs text-blue-700 dark:text-blue-300'>
                  Complete your account setup below
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Traditional Signup Form */}
        <form className='flex flex-col gap-6' onSubmit={(e) => {
          e.preventDefault();
          onSubmit(null);
        }}>
          <StepWizard className='w-full' instance={setWizard}>
            <div className='flex flex-col gap-6'>
              <div>
                <div className='flex justify-between gap-2 flex-wrap mb-2'>
                  <label className='text-sm font-medium' htmlFor='username'>Username</label>
                  {username.length >= 3 &&
                    <div className='flex items-center text-sm gap-2'>
                      {isExistsLoading ? <LoadingSpinner size={20} /> :
                        isValidUsername && !usernameExists ?
                          <div className='text-sm text-green-600 dark:text-green-400'>
                            Username is available
                          </div>
                          :
                          <div className='text-red-500 text-sm'>
                            {!isValidUsername ? 'Username is not valid' : 'Username is not available'}
                          </div>
                      }
                    </div>
                  }
                </div>
                <input required onChange={e => handleUsernameChange(e)} value={username} className='w-full' id='username' type='text' placeholder='Username' />
              </div>
              <button
                className='bg-blue-500 enabled:hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded disabled:opacity-50'
                disabled={isExistsLoading || !isValidUsername || usernameExists}
                onClick={() => (wizard as StepWizardChildProps)?.nextStep()}
                type='button'
              >
                Continue
              </button>
            </div>
            <div className='flex flex-col gap-6'>
              <div className='flex gap-2'>
                <span>
                  Welcome, <span className='font-bold'>{username}</span>
                </span>
                <button onClick={() => (wizard as StepWizardChildProps)?.previousStep()}>
                  <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5 gray hover-color' viewBox='1 1 22 22' strokeWidth='1.5' stroke='currentColor' fill='none' strokeLinecap='round' strokeLinejoin='round'>
                    <path stroke='none' d='M0 0h24v24H0z' fill='none' />
                    <path d='M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4' />
                    <path d='M13.5 6.5l4 4' />
                  </svg>
                </button>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2' htmlFor='email'>Email</label>
                <input required onChange={e => setEmail(e.target.value)} value={email} className='w-full' id='email' type='email' placeholder='Email' />
              </div>
              {/* Only show password field for non-OAuth signups */}
              {!oauthData && (
                <div>
                  <label className='block text-sm font-medium mb-2' htmlFor='password'>Password</label>
                  <input required onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
                </div>
              )}
              <div className='flex gap-3'>
                <input type='checkbox' id='terms_agree_checkbox' required />
                <label htmlFor='terms_agree_checkbox' className='text-xs'>
                  I agree to the <a className='underline' href={TERMS_OF_SERVICE_URL} rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a>.
                </label>
              </div>
              <div className='flex justify-center'>
                {recaptchaPublicKey && showRecaptcha ?
                  <ReCAPTCHA
                    onChange={(token) => onSubmit(token)}
                    ref={recaptchaRef}
                    sitekey={recaptchaPublicKey}
                  />
                  :
                  <button className={classNames(blueButton, 'w-full')} type='submit'>Sign up</button>
                }
              </div>
            </div>
          </StepWizard>
          <div className='flex flex-col gap-4 items-center'>
            <Link
              className='font-medium text-sm text-blue-500 hover:text-blue-400'
              href='/play-as-guest'
            >
              Play as guest
            </Link>
            <div className='text-center text-sm'>
              <span>
                {'Already have an account? '}
              </span>
              <Link
                className='font-medium text-sm text-blue-500 hover:text-blue-400'
                href='/login'
              >
                Log in
              </Link>
            </div>
          </div>
        </form>
      </div>
    </FormTemplate>
  );
}
