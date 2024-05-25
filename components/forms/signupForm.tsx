import { blueButton } from '@root/helpers/className';
import classNames from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import StepWizard, { StepWizardChildProps, StepWizardProps } from 'react-step-wizard';
import { useSWRConfig } from 'swr';
import { debounce } from 'throttle-debounce';
import { AppContext } from '../../contexts/appContext';
import LoadingSpinner from '../page/loadingSpinner';
import FormTemplate from './formTemplate';

export default function SignupForm() {
  const { cache } = useSWRConfig();
  const [email, setEmail] = useState<string>('');
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const [password, setPassword] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const router = useRouter();
  const [username, setUsername] = useState<string>('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 8 || password.length > 50) {
      toast.dismiss();
      toast.error('Password must be between 8 and 50 characters');

      return;
    }

    toast.dismiss();
    toast.loading('Registering...');

    const tutorialCompletedAt = window.localStorage.getItem('tutorialCompletedAt') || '0';
    const utm_source = window.localStorage.getItem('utm_source') || '';

    fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        name: username,
        password: password,
        tutorialCompletedAt: parseInt(tutorialCompletedAt),
        utm_source: utm_source
      }),
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
          toast.success('Registered! Please confirm your email.');

          // clear localstorage value
          window.localStorage.removeItem('tutorialCompletedAt');
          mutateUser();
          setShouldAttemptAuth(true);
          sessionStorage.clear();
          router.push('/confirm-email');
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

  // check if username is valid
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUserName = e.target.value;

    setUsername(newUserName);

    let valid = true;

    if (newUserName.length < 3 || newUserName.length > 50 || newUserName.match(/[^-a-zA-Z0-9_]/)) {
      valid = false;
    }

    setIsValidUsername(valid);

    if (!valid) {
      setIsExistsLoading(false);

      return;
    }

    setIsExistsLoading(true);
    debouncedCheckUsername(newUserName);
  };

  return (
    <FormTemplate title='Create your Thinky.gg account'>
      <form className='flex flex-col gap-6' onSubmit={onSubmit}>
        <StepWizard className='w-full' instance={setWizard}>
          <div className='flex flex-col gap-6'>
            <div>
              <div className='flex justify-between gap-2 flex-wrap mb-2'>
                <label className='text-sm font-medium' htmlFor='username'>Username</label>
                {username.length >= 3 &&
                  <div className='flex items-center text-sm gap-2'>
                    {isExistsLoading ? <LoadingSpinner size={20} /> :
                      isValidUsername && !usernameExists ?
                        <div className='text-sm' style={{
                          color: 'var(--color-complete)',
                        }}>
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
              <input required onChange={e => handleUsernameChange(e)} className='w-full' id='username' type='text' placeholder='Username' />
            </div>
            <button
              className='bg-blue-500 enabled:hover:bg-blue-600 text-white w-full font-medium py-2 px-3 rounded disabled:opacity-50'
              disabled={isExistsLoading || !isValidUsername || usernameExists}
              onClick={() => (wizard as StepWizardChildProps)?.nextStep()}
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
            <div>
              <label className='block text-sm font-medium mb-2' htmlFor='password'>Password</label>
              <input required onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
            </div>
            <div className='flex gap-3'>
              <input type='checkbox' id='terms_agree_checkbox' required />
              <label htmlFor='terms_agree_checkbox' className='text-xs'>
                I agree to the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a>.
              </label>
            </div>
            <button className={classNames(blueButton, 'w-full')} type='submit'>Sign up</button>
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
    </FormTemplate>
  );
}
