import { blueButton } from '@root/helpers/className';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
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
        const redirectUrl = decodeURIComponent(router.query.redirect as string);

        if (redirectUrl && redirectUrl !== 'undefined') {
          router.push(redirectUrl);
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

  return (
    <FormTemplate title='Log in with your Thinky.gg account'>
      <form className='flex flex-col gap-6' onSubmit={onSubmit}>
        <div>
          <label className='block text-sm font-medium mb-2' htmlFor='username'>Username or Email</label>
          <input onChange={e => setName(e.target.value)} className='w-full' id='username' type='text' placeholder='Username or Email' />
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
          <input onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
        </div>
        <button className={classNames(blueButton, 'w-full')} type='submit'>Log in</button>
        {errorMessage &&
          <div className='text-red-500 text-sm text-center'>
            {errorMessage}
          </div>
        }
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
      </form>
    </FormTemplate>
  );
}
