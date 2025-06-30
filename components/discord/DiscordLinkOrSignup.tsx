import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface DiscordLinkOrSignupProps {
  discordUser: {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  onSignupSuccess: () => void;
}

export default function DiscordLinkOrSignup({ discordUser, onSignupSuccess }: DiscordLinkOrSignupProps) {
  const [username, setUsername] = useState('');
  const [isValidUsername, setIsValidUsername] = useState(false);
  const [usernameExists, setUsernameExists] = useState(false);
  const [isExistsLoading, setIsExistsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedCheck = useRef<NodeJS.Timeout | null>(null);

  // Clean Discord username for default (remove initial period or non-alphanumeric)
  useEffect(() => {
    if (discordUser?.username) {
      const clean = discordUser.username.replace(/^[^a-zA-Z0-9]+/, '');

      setUsername(clean);
    }
  }, [discordUser]);

  // Validate username
  const validateUsername = useCallback((newUserName: string) => {
    let valid = true;

    if (newUserName.length < 3 || newUserName.length > 50 || !newUserName.match(/^[a-zA-Z0-9][-a-zA-Z0-9_.]*$/)) {
      valid = false;
    }

    setIsValidUsername(valid);

    if (!valid) {
      setIsExistsLoading(false);
      setUsernameExists(false);

      return;
    }

    setIsExistsLoading(true);
    // Debounce API call
    if (debouncedCheck.current) clearTimeout(debouncedCheck.current);
    debouncedCheck.current = setTimeout(async () => {
      const res = await fetch(`/api/user/exists?name=${encodeURIComponent(newUserName)}`);
      const resObj = await res.json();

      setIsExistsLoading(false);
      setUsernameExists(resObj.exists);
    }, 400);
  }, []);

  useEffect(() => {
    if (username) validateUsername(username);
  }, [username, validateUsername]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    toast.dismiss();
    toast.loading('Registering...');

    try {
      const body = {
        name: username,
        email: discordUser.email || '',
        password: 'oauth-generated',
        oauthData: {
          provider: 'discord',
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordEmail: discordUser.email,
          discordAvatarHash: discordUser.avatar,
        },
      };
      const res = await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      toast.dismiss();

      if (res.status === 200) {
        toast.success('Registered with Discord! Welcome to Thinky.gg!');
        onSignupSuccess();
      } else {
        const err = await res.json();

        setError(err.error || 'Unknown error');
        toast.error(err.error || 'Unknown error');
      }
    } catch (err) {
      setError('Network error');
      toast.error('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-blue-700 rounded-lg p-6 max-w-md text-center'>
        <div className='w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
          {discordUser.avatar ? (
            <Image
              src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`}
              alt='Discord Avatar'
              className='w-16 h-16 rounded-full'
              width={64}
              height={64}
              unoptimized
            />
          ) : (
            <svg className='w-8 h-8 text-blue-700' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
            </svg>
          )}
        </div>
        <h2 className='text-xl font-bold mb-2'>Choose a username</h2>
        <p className='text-sm mb-4'>
          Welcome from Discord, <span className='font-semibold'>{discordUser.username}</span>!<br />
          Choose a Thinky.gg username to complete signup.
        </p>
        <form className='flex flex-col gap-4' onSubmit={onSubmit}>
          <div className='text-left'>
            <label className='block text-sm font-medium mb-1' htmlFor='username'>Username</label>
            <input
              id='username'
              className='w-full px-3 py-2 rounded text-white bg-gray-800'
              type='text'
              placeholder='Choose a username'
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              autoFocus
              autoComplete='off'
            />
            {username.length >= 3 && (
              <div className='text-xs mt-1'>
                {isExistsLoading ? (
                  <span className='text-blue-200'>Checking availability...</span>
                ) : isValidUsername && !usernameExists ? (
                  <span className='text-green-300'>Username is available</span>
                ) : !isValidUsername ? (
                  <span className='text-red-200'>Username is not valid</span>
                ) : (
                  <span className='text-red-200'>Username is not available</span>
                )}
              </div>
            )}
          </div>
          <button
            className='bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50'
            type='submit'
            disabled={isSubmitting || isExistsLoading || !isValidUsername || usernameExists}
          >
            {isSubmitting ? 'Registering...' : 'Sign Up with Discord'}
          </button>
        </form>
        {error && <div className='text-red-200 text-xs mt-2'>{error}</div>}
        <div className='mt-6 text-xs text-gray-300 flex flex-col gap-2 items-center'>
          <div className='bg-yellow-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'>
            <p>Already have a Thinky account?</p>
            <p>Login to Thinky.gg and visit your connection settings.</p>
            <p>Restart this Discord Activity after signing up or linking.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
