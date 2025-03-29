import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';

interface SettingsAccountProps {
  user: User;
}

export default function SettingsAccount({ user }: SettingsAccountProps) {
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [email, setEmail] = useState<string>(user.email);
  const { multiplayerSocket, mutateUser } = useContext(AppContext);
  const [password, setPassword] = useState<string>('');
  const [password2, setPassword2] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(!user.disableConfetti);
  const [hideAfterLevelPopup, setHideAfterLevelPopup] = useState(user.disableAfterLevelPopup);
  const [hideStreakPopup, setHideStreakPopup] = useState(user.disableStreakPopup);
  const [showStatus, setShowStatus] = useState(!user.hideStatus);
  const [username, setUsername] = useState<string>(user.name);

  function updateUser(
    body: string,
    property: string,
  ) {
    toast.dismiss();
    const toastId = toast.loading(`Updating ${property}...`);

    fetch('/api/user', {
      method: 'PUT',
      body: body,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(res => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.success(`Updated ${property}`, { id: toastId });
        mutateUser();
        multiplayerSocket.socket?.emit('refresh');
      }
    }).catch(async err => {
      console.error(err);
      toast.error(JSON.parse(await err)?.error || `Error updating ${property}`, { id: toastId });
    });
  }

  function resendEmailConfirmation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    toast.dismiss();
    toast.loading('Resending activation email...');

    fetch('/api/user', {
      method: 'PUT',
      body: JSON.stringify({
        email: email,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    }).then(res => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.dismiss();
        toast.success('Sent email activation');
      }
    }).catch(async err => {
      console.error(err);
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Error sending confirmation email', {
        duration: 4000,
      });
    });
  }

  function updateStatus() {
    updateUser(
      JSON.stringify({
        hideStatus: showStatus,
      }),
      'online status',
    );

    setShowStatus(prevShowStatus => !prevShowStatus);
  }

  function updateConfetti() {
    updateUser(
      JSON.stringify({
        disableConfetti: showConfetti,
      }),
      'confetti',
    );

    setShowConfetti(prevDisableConfetti => !prevDisableConfetti);
  }

  function updateUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (username.length < 3 || username.length > 50) {
      toast.dismiss();
      toast.error('Username must be between 3 and 50 characters');

      return;
    }

    updateUser(
      JSON.stringify({
        name: username,
      }),
      'username',
    );
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
    if (email.length < 3 || email.length > 50) {
      toast.dismiss();
      toast.error('Email must be between 3 and 50 characters');

      return;
    }

    e.preventDefault();

    updateUser(
      JSON.stringify({
        email: email,
      }),
      'email',
    );
  }

  function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (password.length < 8 || password.length > 50) {
      toast.dismiss();
      toast.error('Password must be at least 8 characters');

      return;
    }

    if (password !== password2) {
      toast.error('Password does not match');

      return;
    }

    updateUser(
      JSON.stringify({
        currentPassword: currentPassword,
        password: password,
      }),
      'password',
    );
  }

  return (
    <div className='flex justify-center w-full max-w-sm'>
      <div className='flex flex-col gap-6 w-full'>
        <div className='flex flex-col gap-2'>
          <div className='block font-bold'>
            Options
          </div>
          <div className='flex gap-2'>
            <input
              checked={showStatus}
              id='showStatus'
              name='showStatus'
              onChange={updateStatus}
              type='checkbox'
            />
            <label className='text-sm' htmlFor='showStatus'>
              Show online status
            </label>
          </div>
          <div className='flex gap-2'>
            <input
              checked={showConfetti}
              id='showConfetti'
              name='showConfetti'
              onChange={updateConfetti}
              type='checkbox'
            />
            <label className='text-sm' htmlFor='showConfetti'>
              Confetti
            </label>
          </div>
          <div className='flex gap-2'>
            <input
              checked={hideAfterLevelPopup}
              id='hideAfterLevelPopup'
              name='hideAfterLevelPopup'
              onChange={e => {
                setHideAfterLevelPopup(e.target.checked);
                updateUser(
                  JSON.stringify({
                    disableAfterLevelPopup: e.target.checked
                  }),
                  'after level popup settings'
                );
              }}
              type='checkbox'
            />
            <label className='text-sm' htmlFor='hideAfterLevelPopup'>
              Hide after level popup
            </label>
          </div>
          <div className='flex gap-2'>
            <input
              checked={hideStreakPopup}
              id='hideStreakPopup'
              name='hideStreakPopup'
              onChange={e => {
                setHideStreakPopup(e.target.checked);
                updateUser(
                  JSON.stringify({
                    disableStreakPopup: e.target.checked
                  }),
                  'streak popup settings'
                );
              }}
              type='checkbox'
            />
            <label className='text-sm' htmlFor='hideStreakPopup'>
              Hide streak popup
            </label>
          </div>
        </div>
        <form className='flex flex-col items-start gap-2' onSubmit={updateUsername}>
          <label className='block font-bold' htmlFor='username'>
            Username
          </label>
          <input
            className='w-full'
            id='username'
            name='username'
            onChange={e => setUsername(e.target.value)}
            placeholder='Username'
            required
            type='text'
            value={username}
          />
          <button className='italic underline' type='submit'>Update</button>
        </form>
        <form className='flex flex-col items-start gap-2' onSubmit={
          (!user.emailConfirmed && email === user.email ? resendEmailConfirmation : updateEmail)
        }>
          <label className='block font-bold' htmlFor='email'>
            {'Email - '}
            {user.emailConfirmed && email === user.email ?
              <span className='text-green-500'>Confirmed</span>
              :
              <span className='text-red-500'>Unconfirmed</span>
            }
          </label>
          <input
            className='w-full'
            id='email'
            name='email'
            onChange={e => setEmail(e.target.value)}
            placeholder='Email'
            required
            type='email'
            value={email}
          />
          <button className='italic underline' type='submit'>
            {!user.emailConfirmed && email === user.email ? 'Resend confirmation' : 'Update'}
          </button>
        </form>
        <form className='flex flex-col items-start gap-2' onSubmit={updatePassword}>
          <label className='block font-bold' htmlFor='password'>
            Password
          </label>
          <input onChange={e => setCurrentPassword(e.target.value)} className='w-full' id='password' value={currentPassword} type='password' placeholder='Enter current password' required />
          <input onChange={e => setPassword(e.target.value)} className='w-full' type='password' placeholder='Enter new password' required />
          <input onChange={e => setPassword2(e.target.value)} className='w-full' type='password' placeholder='Re-enter new password' required />
          <button className='italic underline' type='submit'>Update</button>
        </form>
      </div>
    </div>
  );
}
