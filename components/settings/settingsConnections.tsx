import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import { AuthProvider } from '@root/models/db/userAuth';
import Image from 'next/image';
import React, { useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface AuthProviderData {
  provider: AuthProvider;
  providerId: string;
  providerUsername?: string;
  providerAvatarUrl?: string;
  connectedAt: number;
}

interface SettingsConnectionsProps {
  user: User;
}

export default function SettingsConnections({ user }: SettingsConnectionsProps) {
  const { mutateUser } = useContext(AppContext);
  const [authProviders, setAuthProviders] = useState<AuthProviderData[]>([]);
  const [authProvidersLoading, setAuthProvidersLoading] = useState<boolean>(true);

  // Fetch auth providers
  useEffect(() => {
    setAuthProvidersLoading(true);
    fetch('/api/user/auth-providers', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.authProviders) {
          setAuthProviders(data.authProviders);
        }
      })
      .catch(err => {
        console.error('Failed to fetch auth providers:', err);
      })
      .finally(() => {
        setAuthProvidersLoading(false);
      });
  }, []);

  // Handle OAuth connection success/error messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const discordConnected = urlParams.get('discord_connected');
    const discordError = urlParams.get('discord_error');
    const discordAlreadyConnected = urlParams.get('discord_already_connected');
    const googleConnected = urlParams.get('google_connected');
    const googleError = urlParams.get('google_error');
    const googleAlreadyConnected = urlParams.get('google_already_connected');

    if (discordConnected === 'true') {
      toast.success('Discord account connected successfully!');
      // Refresh auth providers
      setAuthProvidersLoading(true);
      fetch('/api/user/auth-providers', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAuthProviders(data.authProviders || []))
        .catch(console.error)
        .finally(() => setAuthProvidersLoading(false));
    } else if (discordAlreadyConnected === 'true') {
      toast('Discord account is already connected to your account.', { icon: 'ℹ️' });
    } else if (discordError === 'already_linked') {
      toast.error('This Discord account is already linked to another user account.', { duration: 5000 });
    } else if (discordError === 'true') {
      toast.error('Failed to connect Discord account. Please try again.');
    } else if (googleConnected === 'true') {
      toast.success('Google account connected successfully!');
      // Refresh auth providers
      setAuthProvidersLoading(true);
      fetch('/api/user/auth-providers', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAuthProviders(data.authProviders || []))
        .catch(console.error)
        .finally(() => setAuthProvidersLoading(false));
    } else if (googleAlreadyConnected === 'true') {
      toast('Google account is already connected to your account.', { icon: 'ℹ️' });
    } else if (googleError === 'already_linked') {
      toast.error('This Google account is already linked to another user account.', { duration: 5000 });
    } else if (googleError === 'true') {
      toast.error('Failed to connect Google account. Please try again.');
    }

    // Remove the query parameters from the URL while preserving the hash
    if (discordConnected || discordError || discordAlreadyConnected || googleConnected || googleError || googleAlreadyConnected) {
      const newUrl = window.location.pathname + window.location.hash;

      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  function disconnectProvider(provider: AuthProvider) {
    toast.dismiss();
    const toastId = toast.loading(`Disconnecting ${provider}...`);

    setAuthProvidersLoading(true);

    fetch(`/api/auth/disconnect/${provider}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(res => {
      if (res.status === 200) {
        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} disconnected`, { id: toastId });
        // Remove from local state
        setAuthProviders(prev => prev.filter(p => p.provider !== provider));
        mutateUser();
      } else {
        throw new Error('Failed to disconnect');
      }
    }).catch(() => {
      toast.error(`Failed to disconnect ${provider}`, { id: toastId });
    }).finally(() => {
      setAuthProvidersLoading(false);
    });
  }

  function connectProvider(provider: AuthProvider) {
    // Check if we're likely in a mobile app environment
    const isMobileApp = /ReactNative|Expo|wv\)/i.test(navigator.userAgent) ||
                        window.location.protocol === 'file:' ||
                        'ReactNativeWebView' in window;

    // For Google OAuth in mobile apps, add force_mobile parameter
    if (provider === AuthProvider.GOOGLE && isMobileApp) {
      window.location.href = `/api/auth/${provider}?force_mobile=true`;
    } else {
      window.location.href = `/api/auth/${provider}`;
    }
  }

  function getProviderData(provider: AuthProvider) {
    return authProviders.find(p => p.provider === provider);
  }

  function renderProviderCard(provider: AuthProvider, name: string, color: string, icon: React.ReactNode) {
    const providerData = getProviderData(provider);
    const isConnected = !!providerData;

    // Define explicit button styles for each provider
    const getButtonStyles = (providerName: string) => {
      switch (providerName.toLowerCase()) {
      case 'discord':
        return 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500';
      case 'google':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
      }
    };

    if (authProvidersLoading) {
      return (
        <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-6'>
          <div className='flex items-center justify-center h-24'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400' />
          </div>
        </div>
      );
    }

    return (
      <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-6'>
        {isConnected ? (
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
                {providerData.providerAvatarUrl ? (
                  <Image
                    src={providerData.providerAvatarUrl}
                    alt={`${name} Avatar`}
                    className='w-12 h-12 rounded-full'
                    unoptimized
                    width={48}
                    height={48}
                  />
                ) : (
                  icon
                )}
              </div>
              <div>
                <p className='font-medium text-gray-900 dark:text-white'>
                  {providerData.providerUsername || providerData.providerId}
                </p>
                <p className='text-sm text-green-600 dark:text-green-400'>Connected via {name}</p>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Connected {new Date(providerData.connectedAt * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => disconnectProvider(provider)}
              className='bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800'
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className='text-center'>
            <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {icon}
            </div>
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>Connect {name}</h3>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              Link your {name} account to receive personalized notifications and enhance your experience.
            </p>
            <button
              onClick={() => connectProvider(provider)}
              className={`inline-flex items-center ${getButtonStyles(name)} text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
            >
              {icon}
              <span className='ml-2'>Connect with {name}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className='flex items-center mb-6'>
        <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3'>
          <svg className='w-5 h-5 text-purple-600 dark:text-purple-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
          </svg>
        </div>
        <div>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Connected Accounts</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Link external accounts for enhanced features and notifications</p>
        </div>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Discord */}
        {renderProviderCard(
          AuthProvider.DISCORD,
          'Discord',
          'bg-purple-100 dark:bg-purple-900',
          <svg className='w-6 h-6 text-purple-600 dark:text-purple-400' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' />
          </svg>
        )}
        {/* Google */}
        {renderProviderCard(
          AuthProvider.GOOGLE,
          'Google',
          'bg-red-100 dark:bg-red-900',
          <svg className='w-6 h-6 text-red-600 dark:text-red-400' viewBox='0 0 24 24'>
            <path fill='currentColor' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
            <path fill='currentColor' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
            <path fill='currentColor' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
            <path fill='currentColor' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
          </svg>
        )}
      </div>
    </div>
  );
}
