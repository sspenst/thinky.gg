import { DiscordSDK, patchUrlMappings, RPCCloseCodes } from '@discord/embedded-app-sdk';
import { AppContext } from '@root/contexts/appContext';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import AuthenticatingState from './AuthenticatingState';
import AuthorizingState from './AuthorizingState';
import DefaultState from './DefaultState';
import DiscordLinkOrSignup from './DiscordLinkOrSignup';
import ErrorState from './ErrorState';
import InitializingState from './InitializingState';
import LoadingState from './LoadingState';
import NotInDiscordEmbed from './NotInDiscordEmbed';
import SuccessState from './SuccessState';

interface DiscordActivityProps {
  frameId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  userToken?: string;
  sessionId?: string;
  instanceId?: string;
}

type AuthState = 'idle' | 'initializing' | 'authorizing' | 'authenticating' | 'success' | 'error' | 'discordOnly';

// Main Discord activity component
export default function DiscordActivity({
  frameId,
  channelId,
  guildId,
  userId,
  userToken,
  sessionId,
  instanceId
}: DiscordActivityProps) {
  const { userHook } = useContext(AppContext);
  const [connectionInfo, setConnectionInfo] = useState<any>({});
  const [isInDiscordEmbed, setIsInDiscordEmbed] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [discordUser, setDiscordUser] = useState<any>(null);
  const [authorizingTimeout, setAuthorizingTimeout] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasCompletedAuth, setHasCompletedAuth] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const { user, mutateUser, isLoading: isLoadingUser } = userHook;

  useEffect(() => {
    setIsHydrated(true);
    patchUrlMappings([
      { prefix: '/', target: '/.proxy/' },
    ]);
  }, []);

  // Check if we're in a Discord embed
  function isDiscordEmbed() {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);

    return (
      url.searchParams.has('frame_id') ||
      url.searchParams.has('channel_id') ||
      url.searchParams.has('guild_id') ||
      url.searchParams.has('user_id') ||
      url.searchParams.has('user_token') ||
      url.searchParams.has('session_id') ||
      url.searchParams.has('instance_id')
    );
  }

  // Determine current state purely from conditions
  const getCurrentState = (): AuthState => {
    // If we're in the middle of auth flow, show appropriate state
    if (isInitializing) return 'initializing';
    if (isAuthorizing) return 'authorizing';
    if (isAuthenticating) return 'authenticating';

    // If we've completed authentication
    if (hasCompletedAuth) {
      // If we have a user, show success
      if (user) {
        console.log('[DiscordActivity] User is available');

        return 'success';
      }

      // If we have discordUser but no user, show signup
      if (discordUser) {
        return 'discordOnly';
      }

      // No user and no discordUser, but we have completed auth
      // This means authentication failed or user state hasn't updated yet

      if (!isLoadingUser) {
        console.log('[DiscordActivity] No user and no discordUser, but we have completed auth', userHook);

        return 'error';
      }
    }

    // If we're in Discord embed but haven't started auth yet, show initializing
    if (isInDiscordEmbed) {
      return 'initializing';
    }

    return 'idle';
  };

  const currentState = getCurrentState();

  // Initialize Discord SDK and authenticate
  const initializeDiscordAuth = useCallback(async () => {
    try {
      setIsInitializing(true);
      setStatusText('Importing Discord SDK...');

      const sdkModule = await import('@discord/embedded-app-sdk');
      const { DiscordSDK } = sdkModule;

      const clientId = '1379658344058458182';
      const sdk = new DiscordSDK(clientId);

      setDiscordSdk(sdk);

      setStatusText('Initializing Discord SDK...');
      await sdk.ready();

      setStatusText('Calling Discord authorize...');
      setIsInitializing(false);
      setIsAuthorizing(true);

      const authorizeParams = {
        client_id: clientId,
        response_type: 'code' as const,
        state: '',
        prompt: 'none' as const,
        scope: [
          'identify',
          'guilds',
          'applications.commands',
        ] as any,
      };

      const { code } = await sdk.commands.authorize(authorizeParams);

      setStatusText('Exchanging code for access token...');
      setIsAuthorizing(false);
      setIsAuthenticating(true);

      const response = await fetch('/.proxy/api/auth/discord-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code,
          frameId,
          channelId,
          guildId,
        }),
      });

      if (!response.ok) {
        let errorData;

        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text() };
        }

        // If backend says "signup", show signup flow
        if (errorData.action === 'signup' && errorData.discordUser) {
          setDiscordUser(errorData.discordUser);
          setIsAuthenticating(false);
          setHasCompletedAuth(true);

          return;
        }

        setStatusText('Token exchange failed');
        console.error('[DiscordActivity] Token exchange failed:', errorData);
        setIsAuthenticating(false);
        setAuthError('Token exchange failed');

        return;
      }

      setStatusText('Parsing backend response...');
      const { access_token, user, discordUser } = await response.json();

      setStatusText('Authenticating with Discord client...');
      const auth = await sdk.commands.authenticate({
        access_token,
      });

      if (auth == null) {
        setStatusText('Authenticate command failed');
        console.error('[DiscordActivity] Authenticate command failed');
        throw new Error('Authenticate command failed');
      }

      setStatusText('Discord authentication successful!');
      setIsAuthenticating(false);

      if (user) {
        console.log('[DiscordActivity] User authenticated:', user);
        console.log('[DiscordActivity] Cookie set:', document.cookie);
        // User was returned from backend, set completed auth
        // Refresh user state to ensure it's up to date
        console.log('[DiscordActivity] Mutating user');
        mutateUser();
        setTimeout(() => {
          setHasCompletedAuth(true);
        }, 1000);
      } else if (discordUser) {
        setDiscordUser(discordUser);
        // Discord user returned but no user, set completed auth for signup flow
        setHasCompletedAuth(true);
        // Try to refresh user state in case the cookie was set
        mutateUser();
      } else {
        // No user or discordUser returned, this is an error
        setAuthError('Unknown authentication state');
      }
    } catch (error) {
      setStatusText('Error: ' + (error instanceof Error ? error.message : 'Authentication failed'));
      console.error('[DiscordActivity] Discord SDK authentication error:', error);
      setIsInitializing(false);
      setIsAuthorizing(false);
      setIsAuthenticating(false);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    }
  }, [frameId, channelId, guildId, mutateUser]);

  // Initialize component and start auth flow
  useEffect(() => {
    if (!isHydrated) return;

    const inDiscordEmbed = isDiscordEmbed();

    setIsInDiscordEmbed(inDiscordEmbed);

    console.log('Discord Activity Parameters:', {
      frameId,
      channelId,
      guildId,
      userId,
      hasUserToken: !!userToken,
      userAgent: navigator.userAgent,
      url: window.location.href,
      isInDiscordEmbed: inDiscordEmbed,
    });

    setConnectionInfo({
      frameId,
      channelId,
      guildId,
      userId,
      hasUserToken: !!userToken,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      isInDiscordEmbed: inDiscordEmbed,
    });

    // Start auth flow if in Discord embed
    if (inDiscordEmbed) {
      initializeDiscordAuth();
    }
  }, [isHydrated, frameId, channelId, guildId, userId, userToken, initializeDiscordAuth]);

  // Timeout for authorizing state
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isAuthorizing) {
      setAuthorizingTimeout(false);
      timeout = setTimeout(() => {
        setAuthorizingTimeout(true);
      }, 10000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isAuthorizing]);

  // Handle signup success
  const handleSignupSuccess = () => {
    console.log('[DiscordActivity] Signup success');
    mutateUser();
  };

  // Show loading during hydration to prevent hydration mismatch
  if (!isHydrated) {
    return <LoadingState />;
  }

  // Render based on current state
  if (!isInDiscordEmbed) {
    return <NotInDiscordEmbed />;
  }

  if (currentState === 'initializing') {
    return <InitializingState />;
  }

  if (currentState === 'authorizing') {
    return (
      <AuthorizingState
        statusText={statusText}
        authorizingTimeout={authorizingTimeout}
        onRetry={() => {
          discordSdk?.close(RPCCloseCodes.CLOSE_NORMAL, 'User closed activity');
        }}
      />
    );
  }

  if (currentState === 'authenticating') {
    return <AuthenticatingState />;
  }

  if (currentState === 'success') {
    return (
      <SuccessState
        frameId={frameId}
        channelId={channelId}
        guildId={guildId}
        userId={userId}
        connectionInfo={connectionInfo}
        sessionId={sessionId}
        instanceId={instanceId}
      />
    );
  }

  if (currentState === 'discordOnly') {
    return <DiscordLinkOrSignup discordUser={discordUser} onSignupSuccess={handleSignupSuccess} />;
  }

  if (currentState === 'error') {
    return <ErrorState authError={authError} onRetry={() => {
      discordSdk?.close(RPCCloseCodes.CLOSE_NORMAL, 'Restarting activity after error');
    }} />;
  }

  // Default state - show connection info
  return (
    <DefaultState
      frameId={frameId}
      channelId={channelId}
      guildId={guildId}
      userId={userId}
      userToken={userToken}
      connectionInfo={connectionInfo}
      authStatus={currentState}
    />
  );
}
