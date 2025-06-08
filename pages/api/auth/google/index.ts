import { NextApiResponse } from 'next';
import apiWrapper, { NextApiRequestWrapper } from '../../../../helpers/apiWrapper';

function isMobileApp(userAgent: string): boolean {
  // Patterns to detect your React Native app's user agent
  const mobileAppPatterns = [
    // React Native WebView patterns
    /thinky.*mobile/i, // if your app includes "thinky" and "mobile" in user agent
    /thinkygg.*app/i, // if your app includes "thinkygg" and "app"
    /pathology.*mobile/i, // if your app includes "pathology" and "mobile"
    /expo.*webview/i, // Expo development builds
    /ReactNative/i, // React Native WebView

    // Common mobile app webview patterns that Google blocks:
    /wv\)/i, // Android WebView
    /fb_iab/i, // Facebook in-app browser
    /fban|fbav/i, // Facebook app
    /instagram/i, // Instagram in-app browser

    // Expo and React Native specific patterns
    /ExpoWebBrowser/i, // Expo WebBrowser
    /Expo/i, // Expo apps
  ];

  return mobileAppPatterns.some(pattern => pattern.test(userAgent));
}

export default apiWrapper({
  GET: {}
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers.origin}/api/auth/google/callback`;
  const userAgent = req.headers['user-agent'] || '';

  if (!clientId) {
    res.status(500).json({ error: 'Google client ID not configured' });

    return;
  }

  // Check if user is in mobile app (either by user agent or force_mobile query param)
  const forceMobile = req.query?.force_mobile === 'true';

  if (isMobileApp(userAgent) || forceMobile) {
    // For mobile app users, we need to handle Google OAuth differently
    // Option 1: Redirect to a page that opens system browser
    res.redirect(`${req.headers.origin}/auth/google-mobile?redirect=${encodeURIComponent(req.headers.origin || '')}`);

    return;

    // Option 2: Alternative - simply show error message for mobile app users
    // Uncomment this and comment out the above redirect if you prefer:
    /*
    return res.status(400).json({
      error: 'Google sign-in is not available in the mobile app due to security restrictions. Please use Discord sign-in or email/password authentication.'
    });
    */
  }

  const scope = 'openid profile email';
  const state = Buffer.from(JSON.stringify({
    origin: req.headers.origin,
    timestamp: Date.now()
  })).toString('base64');

  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${state}`;

  res.redirect(googleAuthUrl);
});
