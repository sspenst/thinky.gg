import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import messaging, { firebase } from '@react-native-firebase/messaging';
import { registerRootComponent } from 'expo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
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

const BACKGROUND_FETCH_TASK = 'background-fetch';
let lastNotificationTimestamp = 0;
let syncedToken = false;

async function onAppBootstrap() {
  // firebase.json
// if Android
  console.log('BOOTSTRAP. DEVICE OS: ', Device.osName);
  let TOKEN;

  if (Device.osName === 'Android') {
    console.log('Registering device for remote messages');
    await messaging().registerDeviceForRemoteMessages();
    // subscribe to topic pathology
    await messaging().subscribeToTopic('pathology');
    const token = await messaging().getToken();

    TOKEN = token;

    console.log('Android token: ', token);

    messaging().setBackgroundMessageHandler(onRemoteMessage);
  }
  else {
  // if iOS
    const native_token = (await Notifications.getDevicePushTokenAsync()).data;

    console.log('native_token', native_token);
    TOKEN = native_token;

    // Register the device with FCM
    if (syncedToken) {
      console.log('Not registering token, already registered');

      return;
    }

    console.log('Registering device for remote messages');
    await messaging().registerDeviceForRemoteMessages();

    await messaging().requestPermission();
    messaging().onMessage(onRemoteMessage);

    // Get the token
    console.log('Getting token...');
    const token = await messaging().getToken();

    console.log('Received token = ', token);
    // Save the token
  }

  const res = await fetch(`${host}/api/user-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceToken: TOKEN
    }),
  });

  if (!res.ok) {
    console.log('Failed to save token');

    return;
  }

  syncedToken = true;
}

async function onRemoteMessage(message: any) {
  console.log('Received remote message', message);

  const mobileNotification = message?.data as MobileNotification;

  await onMessage(mobileNotification);
}

async function onMessage(mobileNotification: MobileNotification) {
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

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('Background fetch task started');

  // NB: uncomment to test notifications
  // lastNotificationTimestamp = 0;
  // console.log('fetching with lastNotificationTimestamp as', lastNotificationTimestamp);

  const response = await fetch(
    `${host}/api/notification?min_timestamp=${lastNotificationTimestamp}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const data = await response.json();

  if (!data) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const mobileNotification = data.mobileNotification as MobileNotification | null;

  // check if data.notifications exists and is array
  if (!mobileNotification) {
    notifee.setBadgeCount(0);

    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  notifee.setBadgeCount(mobileNotification.badgeCount);

  lastNotificationTimestamp = Math.max(
    mobileNotification.latestUnreadTs,
    lastNotificationTimestamp
  );

  await onMessage(mobileNotification);

  // Be sure to return the successful result type!
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// 2. Register the task at some point in your app by providing the same name,
// and some configuration options for how the background fetch should behave
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function registerBackgroundFetchAsync() {
  const status = await BackgroundFetch.getStatusAsync();

  console.log('BackgroundFetch status: ', status === BackgroundFetch.BackgroundFetchStatus.Available ? 'Available' : 'Unavailable');
  let tasks = await TaskManager.getRegisteredTasksAsync();

  if (tasks.find(f => f.taskName === BACKGROUND_FETCH_TASK) == null) {
    console.log('BackgroundFetch task not registered! Attempting to register');
  }

  const registered = await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    // TODO, change from 1 to something reasonable like 15 (since android respects this)
    minimumInterval: 1, // 15 minutes is minimum for ios
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });

  tasks = await TaskManager.getRegisteredTasksAsync();
  console.log(tasks);

  if (tasks.find(f => f.taskName === BACKGROUND_FETCH_TASK) == null) {
    console.log('BackgroundFetch still not registered!');
  } else {
    console.log('BackgroundFetch registered!');
    console.log('Setting interval to', 1);
    await BackgroundFetch.setMinimumIntervalAsync(1);
  }

  return registered;
}

// 3. (Optional) Unregister tasks by specifying the task name
// This will cancel any future background fetch calls that match the given name
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}

function App() {
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
    notifee.requestPermission();
    console.log('Registering background fetch');
    registerBackgroundFetchAsync();

    onAppBootstrap(); // TODO - CALL WHEN USER HAS LOGGED IN

    return () => {
      console.log('Unregistering background fetch');
      unregisterBackgroundFetchAsync();
    };
  }, []);

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webViewRef = useRef<any>();
  const [webViewUrl, setWebViewUrl] = useState(
    `${host}/home?platform=${Platform.OS}&version=1.0.1`
  );

  console.log('webViewUrl', webViewUrl);

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
    //notifee.onForegroundEvent(handleNotificationEvent);
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
          console.log('NAV STATE CHANGE ' + navState.url);

          // check if matches http://<something>/home
          if (navState.url.includes('/home')) {
            console.log('TRY TO SEND TOKEN?');
            onAppBootstrap();
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
