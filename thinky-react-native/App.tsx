import notifee, { AndroidStyle, Event, EventType } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { registerRootComponent } from 'expo';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, SafeAreaView } from 'react-native';
import WebView from 'react-native-webview';

// same interface as /helpers/getMobileNotification.ts
interface MobileNotification {
  badgeCount?: number;
  body: string;
  imageUrl?: string;
  latestUnreadTs?: number;
  notificationId?: string;
  title: string;
  url: string;
}

const host = 'http://localhost:3000';

let isDeviceTokenRegistered = false;
let onMessageUnsubscribe: () => void;

async function registerDeviceToken() {
  if (isDeviceTokenRegistered) {
    return;
  }

  onMessageUnsubscribe = messaging().onMessage(onRemoteMessage);
  messaging().setBackgroundMessageHandler(onRemoteMessage);

  const token = await messaging().getToken();

  console.log('registerDeviceToken', token);

  const res = await fetch(`${host}/api/notification-push-token`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceToken: token,
      // https://docs.expo.dev/versions/latest/sdk/device
      deviceName: Device.deviceName,
      deviceBrand: Device.brand,
      deviceOSName: Device.osName,
      deviceOSVersion: Device.osVersion,
    }),
  });

  if (!res.ok) {
    console.log('Failed to register token');

    console.log((await res.json()));

    return;
  }

  isDeviceTokenRegistered = true;
}

async function unregisterDeviceToken() {
  if (!isDeviceTokenRegistered) {
    return;
  }

  onMessageUnsubscribe();

  const token = await messaging().getToken();

  console.log('unregisterDeviceToken', token);

  const res = await fetch(`${host}/api/notification-push-token`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceToken: token,
    }),
  });

  if (!res.ok) {
    console.log('Failed to unregister token');

    console.log((await res.json()));

    return;
  }

  isDeviceTokenRegistered = false;
}

async function onRemoteMessage(message: FirebaseMessagingTypes.RemoteMessage) {
  console.log('onRemoteMessage', message);

  const mobileNotification = message.data as unknown as MobileNotification;

  console.log('mobileNotification', mobileNotification);

  const channelId = await notifee.createChannel({
    id: 'pathology-notifications',
    // TODO: Create a unique channel for each type of notification
    name: 'General notifications',
  });

  // create a notification, link to thinky.gg/notifications
  await notifee.displayNotification({
    title: mobileNotification.title,
    body: mobileNotification.body,
    data: {
      url: mobileNotification.url,
      // only set notificationId if there is one
      ...(mobileNotification.notificationId && { notificationId: mobileNotification.notificationId }),
    },
    ios: {
      summaryArgument: 'Thinky',
      summaryArgumentCount: mobileNotification.badgeCount,
      ...(mobileNotification.imageUrl && { attachments: [{ url: mobileNotification.imageUrl }] }),
    },
    android: {
      smallIcon: 'notification_icon',
      groupSummary: true,
      groupId: 'pathology-notifications',
      showTimestamp: true,
      timestamp: mobileNotification.latestUnreadTs,
      channelId,
      pressAction: {
        id: 'default',
      },
      ...(mobileNotification.imageUrl && { style: {
        type: AndroidStyle.BIGPICTURE,
        picture: mobileNotification.imageUrl,
      } })
    },
  });
}

function App() {
  const linkingUrl = Linking.useURL();
  const webViewRef = useRef<WebView>(null);
  const [webViewUrl, setWebViewUrl] = useState(`${host}?platform=${Platform.OS}&version=2.0.3`);

  useEffect(() => {
    if (linkingUrl) {
      console.log('linkingUrl', linkingUrl);
      const { hostname, path, queryParams } = Linking.parse(linkingUrl);

      console.log(hostname, path, queryParams);

      if (hostname !== 'expo-development-client') {
        setWebViewUrl(linkingUrl);
      }
    }
  }, [linkingUrl]);

  useEffect(() => {
    const change = AppState.addEventListener('change', (appStateStatus) => {
      if (appStateStatus === 'active') {
        notifee.setBadgeCount(0);
      }
    });

    return () => {
      change.remove();
    };
  }, []);

  useEffect(() => {
    // request permissions for notifications (required for ios)
    // https://notifee.app/react-native/docs/ios/permissions
    notifee.requestPermission();
  }, []);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      iosClientId: '76339697178-ms4pnsd7ctfnu0sapkm02hpgbdf6hnld.apps.googleusercontent.com', // Correct iOS OAuth client ID
      webClientId: '76339697178-ms4pnsd7ctfnu0sapkm02hpgbdf6hnld.apps.googleusercontent.com', // Use same iOS client ID for consistency
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
    });
  }, []);

  async function handleGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      console.log('Google Sign-In successful:', userInfo);

      // Simple approach: redirect to existing web OAuth callback with user data
      const googleUserData = encodeURIComponent(JSON.stringify({
        id: userInfo.data?.user?.id,
        email: userInfo.data?.user?.email,
        name: userInfo.data?.user?.name,
        picture: userInfo.data?.user?.photo,
        idToken: userInfo.data?.idToken,
        mobile: true
      }));

      const callbackUrl = `${host}/api/auth/google/callback?mobile_auth=${googleUserData}`;

      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.location.href = '${callbackUrl}';
          true;
        `);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign-In is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available');
      } else {
        console.log('Some other error happened');
      }
    }
  }

  useEffect(() => {
    const onAndroidBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();

        return true; // prevent default behavior (exit app)
      }

      return false;
    };

    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);

      return () => {
        backHandler.remove();
      };
    }
  }, []);

  useEffect(() => {
    const handleNotificationEvent = async (event: Event) => {
      console.log('handleNotificationEvent', JSON.stringify(event));

      const notification = event.detail.notification;

      if (!notification) {
        return;
      }

      const data = notification.data;

      if (!data) {
        return;
      }

      if (event.type === EventType.PRESS) {
        if (notification.id) {
          await notifee.cancelNotification(notification.id);
        }

        if (data.notificationId !== undefined) {
          console.log('Marking notification as read serverside');
          const resp = await fetch(
            host + '/api/notification',
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ read: true, ids: [data.notificationId] })
            }
          );

          console.log('Marked notification as read serverside result', resp.status);

          if (resp.status !== 200) {
            console.error('Error marking notification as read', resp.status);
          }
        }

        const url = data.url;

        if (url) {
          console.log('onBackgroundEvent', url);
          const urlStr = url as string;
          const hasParams = urlStr.includes('?');

          setWebViewUrl(`${url as string}${hasParams ? '&' : '?'}ts=${Date.now()}`);
        }
      }
    };

    console.log('Registering notifee events');
    notifee.onForegroundEvent(handleNotificationEvent);
    notifee.onBackgroundEvent(handleNotificationEvent);

    return () => {
      console.log('Webview unmounting');
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <WebView
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowsBackForwardNavigationGestures={true}
        allowsFullscreenVideo={false}
        allowsInlineMediaPlayback={true}
        allowUniversalAccessFromFileURLs={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        onContentProcessDidTerminate={() => {
          if (webViewRef.current) {
            webViewRef.current.reload();
          }
        }}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);

          console.log('onMessage', data);

          if (data.loggedIn) {
            registerDeviceToken();
          } else {
            unregisterDeviceToken();
          }

          // Handle Google OAuth request
          if (data.action === 'google_oauth') {
            handleGoogleSignIn();
          }
        }}
        onNavigationStateChange={(navState) => {
          console.log('onNavigationStateChange', navState.url);
        }}
        onShouldStartLoadWithRequest={(request) => {
          console.log('onShouldStartLoadWithRequest', request.url);

          return true;
        }}
        originWhitelist={[
          'http://localhost:3000*',
          'https://pathology.gg*',
          'https://thinky.gg*',
          'https://*.thinky.gg*',
          'https://discord.com*',
          'https://www.google.com/recaptcha*',
          'https://www.google.com/recaptcha/api2*',
          'https://www.gstatic.com/recaptcha*',
          'https://*.google.com*', // note, https://*.google.com/* is not enough
          'https://*.cdn.growthbook.io*',
        ]}
        pullToRefreshEnabled={true}
        ref={webViewRef}
        sharedCookiesEnabled={true}
        source={{ uri: webViewUrl }}
        startInLoadingState={true}
      />
    </SafeAreaView>
  );
}

console.log('Registering root component');
registerRootComponent(App);
export default App;
