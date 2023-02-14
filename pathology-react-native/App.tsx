import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import * as Device from 'expo-device';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';

// TODO:
// push notification settings (turn notifications off/on)

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

async function registerDeviceToken() {
  if (isDeviceTokenRegistered) {
    return;
  }

  // https://docs.expo.dev/versions/latest/sdk/device/#deviceosname
  console.log('Device.osName', Device.osName);

  await messaging().registerDeviceForRemoteMessages();
  console.log('Registered device for remote messages');

  if (Device.osName === 'Android') {
    // subscribe to topic pathology
    // TODO: do we need to subscribe with ios?
    await messaging().subscribeToTopic('pathology');

    // TODO: setBackgroundMessageHandler vs onMessage for ios?
    messaging().setBackgroundMessageHandler(onRemoteMessage);
  } else {
    await messaging().requestPermission();
    messaging().onMessage(onRemoteMessage);
  }

  const token = await messaging().getToken();

  console.log('TOKEN', token);

  const res = await fetch(`${host}/api/user-config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceToken: token,
    }),
  });

  if (!res.ok) {
    console.log('Failed to save token');

    console.log((await res.json()));

    return;
  }

  isDeviceTokenRegistered = true;
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
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webViewRef = useRef<any>();
  const [webViewUrl, setWebViewUrl] = useState(`${host}/home?platform=${Platform.OS}&version=1.0.1`);

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
    // request permissions for notifications
    // TODO: do we need this if we already do await messaging().requestPermission(); in registerDeviceToken?
    notifee.requestPermission();
  }, []);

  const goBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

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

      console.log('Type ', type);
      console.log('in notification, data is ', data, 'id is ', id);

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

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <WebView
        originWhitelist={['*']}
        ref={webViewRef}
        style={{}}
        containerStyle={{ backgroundColor: 'black' }}
        sharedCookiesEnabled={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        allowFileAccess={true}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={false}
        renderLoading={() => <ActivityIndicator size="large" color="red" />}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress !== 1) {
            setLoading(true);
          } else if (nativeEvent.progress === 1) {
            setLoading(false);
          }
        }}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        pullToRefreshEnabled={true}
        allowsBackForwardNavigationGestures={true}
        onNavigationStateChange={(navState) => {
          console.log('NAV STATE CHANGE', navState.url);

          // check if we are at /home (logged in)
          if (navState.url.includes('/home')) {
            registerDeviceToken();
          }
        }}
        onContentProcessDidTerminate={() => webViewRef.current.reload()}
        mediaPlaybackRequiresUserAction={true}
        source={{ uri: webViewUrl }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        <TouchableOpacity style={{ zIndex: 9999, width: '50%' }} onPress={goBack}>
          <Text style={styles.button}>
            &#8592;
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ width: '50%', zIndex: 9999 }} onPress={goForward}>
          <Text style={styles.button}>
            &#8594;
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <ActivityIndicator
          style={{
            position: 'absolute',
            top: SCREEN_HEIGHT / 2,
            left: SCREEN_WIDTH / 2,
            zIndex: 9999,
            transform: [{ translateX: -25 }, { translateY: -25 }],
          }}
          size="large"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1
  },
  tabBarContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#b43757'
  },
  button: {
    // center
    textAlign: 'center',
    color: 'white',
    fontSize: 40
  }
});

console.log('Registering root component');
registerRootComponent(App);
export default App;
