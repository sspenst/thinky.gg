import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper, ValidType } from '../../../../helpers/apiWrapper';
import { logger } from '../../../../helpers/logger';
import { getUserByProviderId, upsertUserAuthProvider } from '../../../../helpers/userAuthHelpers';
import dbConnect from '../../../../lib/dbConnect';
import getTokenCookie from '../../../../lib/getTokenCookie';
import { captureEvent } from '../../../../lib/posthogServer';
import { AuthProvider } from '../../../../models/db/userAuth';
import { UserModel } from '../../../../models/mongoose';

function createMobileRedirect(path: string, isMobileAuth: boolean): string {
  if (isMobileAuth) {
    // Option 1: Deep link back to mobile app
    return `com.pathology://auth-callback?path=${encodeURIComponent(path)}`;

    // Option 2: Alternative - redirect to a success page that tells user to return to app
    // Uncomment this and comment out the above if deep links are complex to implement:
    /*
    return `${path.split('?')[0]}/auth/google-success?returnPath=${encodeURIComponent(path)}`;
    */
  }

  return path;
}

// Endpoint to handle Google OAuth callback without authentication
const handleGoogleCallback = apiWrapper({
  GET: {
    query: {
      code: ValidType('string'),
      state: ValidType('string', false),
    }
  }
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  await dbConnect();

  const { code, state } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Google OAuth not configured' });

    return;
  }

  let origin = req.headers.origin;
  let isMobileAuth = false;

  // Fallback to constructing origin from host if origin header is missing
  if (!origin) {
    const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers.host;

    origin = `${protocol}://${host}`;
  }

  // Parse state to get original origin if available
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());

      if (stateData.origin) {
        origin = stateData.origin;
      }

      // Check if this is a mobile auth request
      if (stateData.mobile) {
        isMobileAuth = true;
      }
    } catch (e) {
      logger.error('Failed to parse Google OAuth state:', e);
    }
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Google token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Google user fetch failed: ${userResponse.statusText}`);
    }

    const googleUser = await userResponse.json();

    // Check if user is logged in to associate Google with their account
    const token = req.cookies?.token;

    if (token) {
      // User is logged in - link Google account to existing user
      const { getUserFromToken } = await import('../../../../lib/withAuth');
      const user = await getUserFromToken(token, req);

      if (!user) {
        res.redirect(createMobileRedirect(`${origin}/login?error=session_expired`, isMobileAuth));

        return;
      }

      // Check if this Google account is already linked to ANY user
      const existingAuth = await getUserByProviderId(AuthProvider.GOOGLE, googleUser.id);

      if (existingAuth) {
        // Google account is already linked
        if (existingAuth.userId.toString() === user._id.toString()) {
          // Already linked to current user - show "already connected" message
          res.redirect(createMobileRedirect(`${origin}/settings?google_already_connected=true#connections`, isMobileAuth));

          return;
        } else {
          // Linked to different user - show error
          res.redirect(createMobileRedirect(`${origin}/settings?google_error=already_linked#connections`, isMobileAuth));

          return;
        }
      }

      // Google account is not linked to anyone - proceed with linking
      await upsertUserAuthProvider(user._id, AuthProvider.GOOGLE, {
        providerId: googleUser.id,
        providerUsername: googleUser.name,
        providerEmail: googleUser.email,
        providerAvatarUrl: googleUser.picture,
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      // Track Google account linking
      captureEvent(user._id.toString(), 'OAuth Account Linked', {
        provider: 'google',
        provider_username: googleUser.name,
        is_linking: true,
      });

      // Redirect to settings with success message
      res.redirect(createMobileRedirect(`${origin}/settings?google_connected=true#connections`, isMobileAuth));
    } else {
      // User not logged in - check if Google account is already linked to a user
      const existingAuth = await getUserByProviderId(AuthProvider.GOOGLE, googleUser.id);

      if (existingAuth) {
        // Login the user
        const user = await UserModel.findById(existingAuth.userId);

        if (user) {
          const tokenCookie = getTokenCookie(user._id.toString(), req.headers?.host);

          res.setHeader('Set-Cookie', tokenCookie);

          // Track Google OAuth login
          captureEvent(user._id.toString(), 'User Logged In', {
            login_method: 'oauth',
            oauth_provider: 'google',
          });

          // Check for redirect URL in session storage (handled by frontend)
          res.redirect(createMobileRedirect(`${origin}/?google_login=success`, isMobileAuth));

          return;
        }
      }

      // No existing user with this Google account - redirect to signup with Google info
      const signupUrl = `${origin}/signup?google_temp=${encodeURIComponent(JSON.stringify({
        googleId: googleUser.id,
        googleUsername: googleUser.name,
        googleEmail: googleUser.email,
        googleAvatarUrl: googleUser.picture,
        access_token,
        refresh_token
      }))}`;

      res.redirect(createMobileRedirect(signupUrl, isMobileAuth));
    }
  } catch (error) {
    logger.error('Google OAuth callback error:', error);
    res.redirect(createMobileRedirect(`${origin}/login?google_error=true`, isMobileAuth));
  }
});

export default handleGoogleCallback;
