import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import * as Device from 'expo-device';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

// same interface as /helpers/getMobileNotification.ts
interface MobileNotification {
  badgeCount: number;
  body: string;
  imageUrl?: string;
  latestUnreadTs: number;
  notificationId?: string;
  url: string;
}

const host = 'https://pathology.gg';

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
  console.log('Received remote message', message);

  const mobileNotification = message.data as unknown as MobileNotification;

  await onMessage(mobileNotification);
}

async function onMessage(mobileNotification: MobileNotification) {
  console.log('mobileNotification', mobileNotification);

  const channelId = await notifee.createChannel({
    id: 'pathology-notifications',
    // TODO: Create a unique channel for each type of notification
    name: 'General notifications',
  });

  console.log('YOOO', mobileNotification);
  // create a notification, link to pathology.gg/notifications
  await notifee.displayNotification({
    title: 'Pathology',
    body: mobileNotification.body,
    data: {
      url: mobileNotification.url,
      // only set notificationId if there is one
      ...(mobileNotification.notificationId && { notificationId: mobileNotification.notificationId }),
    },
    ios: {
      summaryArgument: 'Pathology',
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
  const webViewRef = useRef<WebView>();
  const [webViewUrl, setWebViewUrl] = useState(`${host}/home?platform=${Platform.OS}&version=1.1`);

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
    const onAndroidBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();

        return true; // prevent default behavior (exit app)
      }

      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onAndroidBackPress);
      };
    }
  }, []);

  useEffect(() => {
    const handleNotificationEvent = async (event) => {
      console.log('in handleNotificationEvent');
      const { type } = event;
      const { data, id } = event.detail.notification;

      console.log(JSON.stringify(event));

      if (type === EventType.PRESS) {
        await notifee.cancelNotification(id);

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

        if (!data) return;

        const { url } = data;

        console.log('onBackgroundEvent', url);

        if (url) {
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
        onNavigationStateChange={(navState) => {
          console.log('NAV STATE CHANGE', navState.url);

          if (navState.url.includes('/home')) {
            // if we make it to this page we are logged in, so register the device for push notifications
            registerDeviceToken();
          } else if (navState.url === host || navState.url === `${host}/`) {
            // after logout you arrive back at the base url, so unregister the device
            unregisterDeviceToken();
          }
        }}
        originWhitelist={['https://pathology.gg*', 'https://discord.com*']}
        pullToRefreshEnabled={true}
        ref={webViewRef}
        sharedCookiesEnabled={true}
        source={{ uri: webViewUrl }}
        startInLoadingState={true}
      />
      <View style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}>
        <TouchableOpacity onPress={() => {
          if (webViewRef.current) {
            webViewRef.current.goBack();
          }
        }}>
          <Text style={styles.button}>
            &#8592;
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          if (webViewRef.current) {
            webViewRef.current.reload();
          }
        }}>
          <Text style={styles.button}>
            &#8635;
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          if (webViewRef.current) {
            webViewRef.current.goForward();
          }
        }}>
          <Text style={styles.button}>
            &#8594;
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    color: 'white',
    fontSize: 32,
    textAlign: 'center',
  }
});

console.log('Registering root component');
registerRootComponent(App);
export default App;
