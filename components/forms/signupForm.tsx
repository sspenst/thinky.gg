import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { AppContext } from '../../contexts/appContext';
import FormTemplate from './formTemplate';

interface SignupFormProps {
  recaptchaPublicKey?: string;
}

export default function SignupForm({ recaptchaPublicKey }: SignupFormProps) {
  const { cache } = useSWRConfig();
  const [email, setEmail] = useState<string>('');
  const { mutateUser, setShouldAttemptAuth } = useContext(AppContext);
  const [password, setPassword] = useState<string>('');
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const router = useRouter();
  const [showRecaptcha, setShowRecaptcha] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');

  function onRecaptchaChange(value: string | null) {
    if (value) {
      setRecaptchaToken(value);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 8 || password.length > 50) {
      toast.dismiss();
      toast.error('Password must be between 8 and 50 characters');

      return;
    }

    if (username.length < 3 || username.length > 50) {
      toast.dismiss();
      toast.error('Username must be between 3 and 50 characters');

      return;
    }

    if (username.match(/[^-a-zA-Z0-9_]/)) {
      toast.dismiss();
      toast.error('Username can only contain letters, numbers, underscores, and hyphens');

      return;
    }

    if (!showRecaptcha && recaptchaPublicKey) {
      setShowRecaptcha(true);

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
        recaptchaToken: recaptchaToken,
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

  return (
    <FormTemplate>
      <form className='flex flex-col gap-4' onSubmit={onSubmit}>
        <div>
          <label className='block text-sm font-bold mb-2 ' htmlFor='username'>
            Username
          </label>
          <input required onChange={e => setUsername(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='username' type='text' placeholder='Username' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='email'>
            Email
          </label>
          <input required onChange={e => setEmail(e.target.value)} value={email} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='email' type='email' placeholder='Email' />
        </div>
        <div>
          <label className='block text-sm font-bold mb-2' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setPassword(e.target.value)} className='shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline' id='password' type='password' placeholder='******************' />
        </div>
        {recaptchaPublicKey && showRecaptcha && (
          <div className='w-full pt-2'>
            <ReCAPTCHA
              size='normal'
              onChange={onRecaptchaChange}
              ref={recaptchaRef}
              sitekey={recaptchaPublicKey ?? ''}
            />
          </div>
        )}
        <div className='flex items-center justify-between gap-1'>
          <input type='checkbox' id='terms_agree_checkbox' required />
          <label htmlFor='terms_agree_checkbox' className='text-xs p-1'>
            I agree to the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vR4E-RcuIpXSrRtR3T3y9begevVF_yq7idcWWx1A-I9w_VRcHhPTkW1A7DeUx2pGOcyuKifEad3Qokn/pub' rel='noreferrer' target='_blank'>terms of service</a> and reviewed the <a className='underline' href='https://docs.google.com/document/d/e/2PACX-1vSNgV3NVKlsgSOEsnUltswQgE8atWe1WCLUY5fQUVjEdu_JZcVlRkZcpbTOewwe3oBNa4l7IJlOnUIB/pub' rel='noreferrer' target='_blank'>privacy policy</a>.
          </label>
        </div>
        <div className='flex flex-wrap gap-y-4 items-center justify-between'>
          <input className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer' type='submit' value='Sign Up' />
          <Link
            className='inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-400'
            href='/play-as-guest'
          >
            Play as Guest
          </Link>
        </div>
      </form>
    </FormTemplate>
  );
}
