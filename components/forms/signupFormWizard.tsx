import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef, useState } from 'react';
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
  const [usernameExists, setUsernameExists] = useState<boolean>(false);
  const [isExistsLoading, setIsExistsLoading] = useState<boolean>(false);

  const checkUsername = async (username: string) => {
    const res = await fetch(`/api/user/exists?name=${username}`);
    const resObj = await res.json();

    setIsExistsLoading(false);
    setUsernameExists(!resObj.exists);
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
      <form className='flex flex-col items-center gap-4' onSubmit={onSubmit}>
        <StepWizard className='w-full' instance={setWizard}>
          <div className='flex flex-col gap-4'>
            <div>
              <label className='block mb-2' htmlFor='username'>Username</label>
              <input required onChange={e => handleUsernameChange(e)} className='w-full' id='username' type='text' placeholder='Username' />
            </div>
            <button
              className='bg-blue-600 enabled:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50'
              disabled={!isValidUsername || !usernameExists}
              onClick={() => (wizard as any)?.nextStep()}
            >
              Continue
            </button>
            {username.length >= 3 &&
              <div className='flex items-center gap-2'>
                {isExistsLoading ? <LoadingSpinner size='small' /> : <>
                  <span className={`text-sm ${isValidUsername ? 'text-green-600' : 'text-red-600'}`}>
                    {isValidUsername && usernameExists ? '✅' : '❌'}
                  </span>
                  <span>
                    {!isValidUsername ? 'Username is not valid' : usernameExists ? 'Username is available' : 'Username is not available'}
                  </span>
                </>
                }
              </div>
            }
          </div>
          <div className='flex flex-col gap-2'>
            <p className='text-center text-lg'>
              Nice to meet you, <span className='font-bold'>{username}</span>!
            </p>
            <p className='text-center text-md'>
              Your Thinky.gg journey is about to launch! 🚀
            </p>
            <div>
              <label className='block mb-2' htmlFor='email'>Email</label>
              <input required onChange={e => setEmail(e.target.value)} value={email} className='w-full' id='email' type='email' placeholder='Email' />
            </div>
            <div>
              <label className='block mb-2' htmlFor='password'>Password</label>
              <input required onChange={e => setPassword(e.target.value)} className='w-full' id='password' type='password' placeholder='Password' />
            </div>
            <div className='flex flex-col gap-4'>
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
        <Link
          className='font-medium mt-2 text-sm text-blue-500 hover:text-blue-400'
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
      </form>
    </FormTemplate>
  );
}
