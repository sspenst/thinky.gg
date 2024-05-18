import { useRouter } from 'next/router';
import React, { useContext, useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import StepWizard, { StepWizardProps } from 'react-step-wizard';
import { useSWRConfig } from 'swr';
import { debounce } from 'throttle-debounce';
import { AppContext } from '../../contexts/appContext';
import LoadingSpinner from '../page/loadingSpinner';
import FormTemplate from './formTemplate';

export default function SignupFormWizard() {
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

    if (username.match(/[^-a-zA-Z0-9_]/)) {
      toast.dismiss();
      toast.error('Username can only contain letters, numbers, underscores, and hyphens');

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

  const [isValidUsername, setIsValidUsername] = useState<boolean>(true);
  const [wizard, setWizard] = useState<StepWizardProps>();
  const isLoadingExistsCheck = useRef<boolean>(false);
  // let's check if username exists already when user types
  const checkUsername = async (username: string) => {
    if (username.length < 3 || username.length > 50) {
      setIsValidUsername(false);

      return;
    }

    const res = await fetch(`/api/user/exists?name=${username}`);

    isLoadingExistsCheck.current = false;
    setIsValidUsername(res.status === 404);
  };

  // debounce the checkUsername function
  const debouncedCheckUsername = useRef(
    debounce(500, checkUsername)
  ).current;

  // check if username is valid
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    isLoadingExistsCheck.current = true;
    debouncedCheckUsername(e.target.value);
  };

  useEffect(() => {
    if (username.length < 3 || username.length > 50) {
      setIsValidUsername(false);

      return;
    }

    if (username.match(/[^-a-zA-Z0-9_]/)) {
      setIsValidUsername(false);

      return;
    }
  }, [username]);

  return (

    <FormTemplate>
      <form className='flex flex-col gap-4' onSubmit={onSubmit}>
        <StepWizard instance={setWizard}

        >
          <div className='flex flex-col gap-4'>
            <label className='block text-sm font-bold  ' htmlFor='username'>
            What should we call you?
            </label>
            <input required onChange={e => handleUsernameChange(e)} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username' />
            <button type='button' disabled={username.length === 0 || !isValidUsername} onClick={() => (wizard as any)?.nextStep()}
              className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer disabled:opacity-50'>Next</button>
            { username.length >= 3 && (
              <div className='flex items-center gap-2'>
                {username.length > 0 && !isLoadingExistsCheck.current && (
                  <span className={`text-sm ${isValidUsername ? 'text-green-600' : 'text-red-600'}`}>
                    {isValidUsername ? '✅' : '❌'}
                  </span>
                )}
                <span className='text-sm'>
                  { isLoadingExistsCheck.current ? <LoadingSpinner size='small' /> : (
                    isValidUsername ? 'Username is available' : 'Username is not available'
                  )}
                </span>
              </div>
            )}
          </div>
          <div className='flex flex-col gap-2'>
            <p className='text-center text-lg'>
            Nice to meet you, <span className='font-bold'>{username}</span>!
            </p>
            <p className='text-center text-md'>
            Your Thinky.gg journey is about to launch! 🚀
            </p>
            <label className='block text-sm font-bold ' htmlFor='email'>
            Email
            </label>
            <input required onChange={e => setEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email' />
            <div className='flex flex-col gap-4'>
              <label className='block text-sm font-bold ' htmlFor='password'>
            Password
              </label>
              <input required onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************' />
              <div className='flex items-center justify-between gap-1'>
                <button type='button' onClick={() => (wizard as any)?.previousStep()} className='bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'>Prev</button>
                <button type='submit' className='bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer'>Let&apos;s play!</button>
              </div>
            </div>
            <div className='flex items-center justify-between gap-1'>
              <input type='checkbox' id='terms_agree_checkbox' required />
              <label htmlFor='terms_agree_checkbox' className='text-xs p-1'>
            I agree to the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a>.
              </label>
            </div>
          </div>
        </StepWizard>
      </form>
    </FormTemplate>
  );
}
