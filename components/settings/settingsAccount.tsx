import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import { AuthProvider } from '@root/models/db/userAuth';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface SettingsAccountProps {
  user: User;
}

interface AuthProviderData {
  provider: AuthProvider;
  providerId: string;
  providerUsername?: string;
  providerAvatarUrl?: string;
  connectedAt: number;
}

// Common CSS classes
const INPUT_CLASSES = 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors';
const BUTTON_CLASSES = 'w-full font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800';
const CHECKBOX_CLASSES = 'w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600';

// Reusable form field component (moved outside to prevent recreation)
const FormField = React.memo(({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = INPUT_CLASSES
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  className?: string;
}) => (
  <div>
    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor={id}>
      {label}
    </label>
    <input
      className={className}
      id={id}
      name={id}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      value={value}
    />
  </div>
));

FormField.displayName = 'FormField';

// Reusable preference toggle component (moved outside to prevent recreation)
const PreferenceToggle = React.memo(({
  id,
  label,
  description,
  checked,
  onChange,
  icon
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
}) => (
  <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
    <div className='flex items-center space-x-3'>
      {icon}
      <div>
        <label className='font-medium text-gray-900 dark:text-white' htmlFor={id}>
          {label}
        </label>
        <p className='text-sm text-gray-600 dark:text-gray-400'>{description}</p>
      </div>
    </div>
    <input
      checked={checked}
      id={id}
      name={id}
      onChange={e => onChange(e.target.checked)}
      type='checkbox'
      className={CHECKBOX_CLASSES}
    />
  </div>
));

PreferenceToggle.displayName = 'PreferenceToggle';

export default function SettingsAccount({ user }: SettingsAccountProps) {
  const [authProviders, setAuthProviders] = useState<AuthProviderData[]>([]);
  const [authProvidersLoading, setAuthProvidersLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>(user.email);
  const { multiplayerSocket, mutateUser } = useContext(AppContext);
  const [showConfetti, setShowConfetti] = useState(!user.disableConfetti);
  const [hideAfterLevelPopup, setHideAfterLevelPopup] = useState(user.disableAfterLevelPopup || false);
  const [hideStreakPopup, setHideStreakPopup] = useState(user.disableStreakPopup || false);
  const [showStatus, setShowStatus] = useState(!user.hideStatus);
  const [username, setUsername] = useState<string>(user.name);

  // Stabilize input change handlers to prevent re-renders
  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  }, []);

  // Check if user has OAuth providers (for showing the "don't know password" option)
  const hasOAuthProviders = authProviders.length > 0;

  // Helper function to refresh auth providers
  const refreshAuthProviders = useCallback(() => {
    setAuthProvidersLoading(true);
    fetch('/api/user/auth-providers', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAuthProviders(data.authProviders || []))
      .catch(console.error)
      .finally(() => setAuthProvidersLoading(false));
  }, []);

  // Helper function to handle preference toggles
  const createPreferenceToggle = useCallback((
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    apiKey: string,
    propertyName: string
  ) => {
    return (checked: boolean) => {
      setter(checked);
      updateUser(JSON.stringify({ [apiKey]: checked }), propertyName);
    };
  }, [updateUser]);

  // Fetch auth providers on component mount
  useEffect(() => {
    refreshAuthProviders();
  }, [refreshAuthProviders]);

  // Helper function to send password reset email
  const handleSendPasswordResetEmail = useCallback(() => {
    toast.dismiss();
    const toastId = toast.loading('Sending password reset email...');

    fetch('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).then(res => {
      if (res.status !== 200) {
        throw res.text();
      } else {
        toast.success('Password reset email sent! Check your inbox.', { id: toastId, duration: 5000 });
      }
    }).catch(async err => {
      console.error(err);
      toast.error(JSON.parse(await err)?.error || 'Error sending password reset email', { id: toastId });
    });
  }, [user.email]);

  function updateUser(body: string, property: string) {
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
      body: JSON.stringify({ email: email }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
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

  const updateStatus = useCallback((checked: boolean) => {
    updateUser(JSON.stringify({ hideStatus: !checked }), 'online status');
    setShowStatus(checked);
  }, [updateUser]);

  const updateConfetti = useCallback((checked: boolean) => {
    updateUser(JSON.stringify({ disableConfetti: !checked }), 'confetti');
    setShowConfetti(checked);
  }, [updateUser]);

  function updateUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (username.length < 3 || username.length > 50) {
      toast.dismiss();
      toast.error('Username must be between 3 and 50 characters');

      return;
    }

    updateUser(JSON.stringify({ name: username }), 'username');
  }

  function updateEmail(e: React.FormEvent<HTMLFormElement>) {
    if (email.length < 3 || email.length > 50) {
      toast.dismiss();
      toast.error('Email must be between 3 and 50 characters');

      return;
    }

    e.preventDefault();
    updateUser(JSON.stringify({ email: email }), 'email');
  }

  // Create preference toggle handlers
  const handleAfterLevelPopupToggle = useCallback(createPreferenceToggle(
    setHideAfterLevelPopup,
    'disableAfterLevelPopup',
    'after level popup settings'
  ), [createPreferenceToggle]);

  const handleStreakPopupToggle = useCallback(createPreferenceToggle(
    setHideStreakPopup,
    'disableStreakPopup',
    'streak popup settings'
  ), [createPreferenceToggle]);

  return (
    <div className='space-y-8'>
      {/* Preferences Section */}
      <div>
        <div className='flex items-center mb-6'>
          <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3'>
            <svg className='w-5 h-5 text-blue-600 dark:text-blue-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4' />
            </svg>
          </div>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Preferences</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Customize your experience</p>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
          <PreferenceToggle
            id='showStatus'
            label='Online Status'
            description="Show when you're online"
            checked={showStatus}
            onChange={updateStatus}
            icon={
              <div className='w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center'>
                <div className={`w-2 h-2 rounded-full ${showStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
            }
          />
          <PreferenceToggle
            id='showConfetti'
            label='Confetti Effects'
            description='Celebrate beating levels'
            checked={showConfetti}
            onChange={updateConfetti}
            icon={
              <div className='w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center'>
                <span className='text-yellow-600 dark:text-yellow-400'>🎉</span>
              </div>
            }
          />
          <PreferenceToggle
            id='hideAfterLevelPopup'
            label='Hide Level Popup'
            description='Skip after-level notifications'
            checked={hideAfterLevelPopup}
            onChange={handleAfterLevelPopupToggle}
            icon={
              <div className='w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center'>
                <svg className='w-4 h-4 text-purple-600 dark:text-purple-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' />
                </svg>
              </div>
            }
          />
          <PreferenceToggle
            id='hideStreakPopup'
            label='Hide Streak Popup'
            description='Skip streak notifications'
            checked={hideStreakPopup}
            onChange={handleStreakPopupToggle}
            icon={
              <div className='w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center'>
                <svg className='w-4 h-4 text-orange-600 dark:text-orange-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 18.657A8 8 0 616.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' />
                </svg>
              </div>
            }
          />
        </div>
      </div>
      {/* Profile Information */}
      <div>
        <div className='flex items-center mb-6'>
          <div className='w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mr-3'>
            <svg className='w-5 h-5 text-indigo-600 dark:text-indigo-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
            </svg>
          </div>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Profile Information</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Update your personal details</p>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
          <form className='space-y-4' onSubmit={updateUsername}>
            <FormField
              label='Username'
              id='username'
              value={username}
              onChange={handleUsernameChange}
              placeholder='Enter your username'
              required
            />
            <button className={`${BUTTON_CLASSES} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`} type='submit'>
              Update Username
            </button>
          </form>
          <form className='space-y-4' onSubmit={!user.emailConfirmed && email === user.email ? resendEmailConfirmation : updateEmail}>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2' htmlFor='email'>
                Email Address
              </label>
              <div className='relative'>
                <input
                  className={`${INPUT_CLASSES} pr-12`}
                  id='email'
                  name='email'
                  onChange={handleEmailChange}
                  placeholder='Enter your email'
                  required
                  type='email'
                  value={email}
                />
                <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
                  {user.emailConfirmed && email === user.email ? (
                    <svg className='w-5 h-5 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                    </svg>
                  ) : (
                    <svg className='w-5 h-5 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.854-.833-2.624 0L3.228 16.5c-.77.833.192 2.5 1.732 2.5z' />
                    </svg>
                  )}
                </div>
              </div>
              <p className={`text-sm mt-1 ${user.emailConfirmed && email === user.email ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {email === user.email
                  ? (user.emailConfirmed ? 'Email confirmed' : 'Email not confirmed')
                  : 'Email will need confirmation'}
              </p>
            </div>
            <button
              className={`${BUTTON_CLASSES} ${
                !user.emailConfirmed && email === user.email
                  ? 'bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
              type='submit'
            >
              {!user.emailConfirmed && email === user.email ? 'Resend Confirmation' : 'Update Email'}
            </button>
          </form>
        </div>
      </div>
      {/* Security Section */}
      <div>
        <div className='flex items-center mb-6'>
          <div className='w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mr-3'>
            <svg className='w-5 h-5 text-red-600 dark:text-red-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
            </svg>
          </div>
          <div>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Security</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>Update your password to keep your account secure</p>
          </div>
        </div>
        {authProvidersLoading ? (
          <div className='flex items-center justify-center h-32'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400' />
          </div>
        ) : (
          <div className='max-w-md'>
            {hasOAuthProviders && (
              <div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg'>
                <div className='flex items-start space-x-3'>
                  <svg className='w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                  <div>
                    <p className='text-sm font-medium text-blue-800 dark:text-blue-200'>
                      Connected via {authProviders.map(p => p.provider).join(' and ')}
                    </p>
                    <p className='text-sm text-blue-700 dark:text-blue-300'>
                      You can change your password using the password reset email below.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className='space-y-4'>
              <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                <div className='flex items-center space-x-3 mb-3'>
                  <svg className='w-5 h-5 text-gray-600 dark:text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                  </svg>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-white'>Password Reset Email</p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      We&apos;ll send you a secure link to change your password
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSendPasswordResetEmail}
                  className={`${BUTTON_CLASSES} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`}
                  type='button'
                >
                  Send Password Reset Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
