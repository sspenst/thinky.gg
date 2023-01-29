import notifee, { EventType } from '@notifee/react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Button,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import WebView from 'react-native-webview';
import AchievementInfo from '../constants/achievementInfo';
import NotificationType from '../constants/notificationType';
import { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import User from '../models/db/user';
import { registerRootComponent } from 'expo';

// TODO:
// notification icons (can we use level/pfp images for notifications or do we have to use the app logo?)
// push notification settings (turn notifications off/on)
// test android

const host = 'https://pathology.gg';

export async function getNotificationString(
  username: string,
  notification: Notification
) {
  const targetLevel = notification.target as EnrichedLevel;
  const targetUser = notification.target as User;

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT: {
    if (notification.source) {
      return [
        `Achievement unlocked! ${
          AchievementInfo[notification.source.type].description
        }`,
        `${host}/profile/${username}/achievements`,
        undefined,
      ];
    }

    return [
      'Unknown achievement',
      `${host}/profile/${username}/achievements`,
      undefined,
    ];
  }

  case NotificationType.NEW_FOLLOWER:
    return [
      `${notification.source.name} started following you`,
      `${host}/profile/${notification.source.name}`,
      `${host}/api/avatar/${notification.source._id}.png`,
    ];

  case NotificationType.NEW_LEVEL: {
    return [
      `${notification.source.name} published a new level: ${targetLevel.name}`,
      `${host}/level/${targetLevel.slug}`,
      `${host}/api/level/image/${targetLevel._id}.png`,
    ];
  }

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT: {
    return [
      `${notification.source.name} set a new record: ${targetLevel.name} - ${notification.message} moves`,
      `${host}/level/${targetLevel.slug}`,
      `${host}/api/level/image/${targetLevel._id}.png`,
    ];
  }

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL: {
    return [
      `${notification.source.name} wrote a ${
        isNaN(Number(notification.message))
          ? notification.message
          : Number(notification.message) > 0
            ? `${Number(notification.message)} stars`
            : undefined
      } review on your level ${targetLevel.name}`,
      `${host}/level/${targetLevel.slug}`,
      `${host}/api/level/image/${targetLevel._id}.png`,
    ];
  }

  case NotificationType.NEW_WALL_POST: {
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    return [
      `${notification.source.name} posted "${shortenedText}" on your profile.`,
      `${host}/profile/${username}`,
      `${host}/api/avatar/${notification.source._id}.png`,
    ];
  }

  case NotificationType.NEW_WALL_REPLY: {
    const comment = notification.message
      ? JSON.parse(notification.message)
      : null;
    const shortenedText = comment
      ? comment.text.length > 10
        ? comment.text.substring(0, 10) + '...'
        : comment.text
      : '';

    return [
      `${notification.source.name} replied "${shortenedText}" to your message on ${targetUser.name}'s profile.`,
      `${host}/profile/${targetUser.name}`,
      `${host}/api/avatar/${notification.source._id}.png`,
    ];
  }

  default:
    return ['Unknown', `${host}/notifications`, undefined];
  }
}

const BACKGROUND_FETCH_TASK = 'background-fetch';
let lastNotificationTimestamp = 0;

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log('Background fetch task started');
  // temp
  // TODO: FIX THIS
  lastNotificationTimestamp = 0;
  console.log(
    'fetching with lastNotificationTimestamp as ',
    lastNotificationTimestamp
  );

  const response = await fetch(
    `${host}/api/notification?read=false&min_timestamp=${lastNotificationTimestamp}`,
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

  // check if data.notifications exists and is array
  if (!data.notifications || !Array.isArray(data.notifications)) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const notifications = data.notifications as Notification[];
  const unreadNotifications = notifications.filter((n) => !n.read);

  notifee.setBadgeCount(unreadNotifications.length);

  if (unreadNotifications.length === 0) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // if only one notification then write out more explicitly what the notif is
  let body = `You have ${unreadNotifications.length} unread notifications`;
  let url = `${host}/notifications?filter=unread`;
  let imageUrl = undefined;
  const latestUnreadTs = new Date(unreadNotifications[0].createdAt).getTime();

  lastNotificationTimestamp = Math.max(
    latestUnreadTs,
    lastNotificationTimestamp
  );
  let notificationId = undefined;

  if (unreadNotifications.length === 1) {
    [body, url, imageUrl] = await getNotificationString(
      data.name,
      unreadNotifications[0]
    );
    notificationId = unreadNotifications[0]._id;
  }

  // create a notification, link to pathology.gg/notifications
  await notifee.displayNotification({
    title: 'Pathology',
    body: body,
    data: {
      url: url,
      // only set notificationId if there is one
      ...(notificationId && { notificationId: notificationId }),
    },
    ios: {
      ...(imageUrl && { attachments: [{ url: imageUrl }] }),
    },
  });

  // Be sure to return the successful result type!
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// 2. Register the task at some point in your app by providing the same name,
// and some configuration options for how the background fetch should behave
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 1, // 15 minutes
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}

// 3. (Optional) Unregister tasks by specifying the task name
// This will cancel any future background fetch calls that match the given name
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}

function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState<BackgroundFetch.BackgroundFetchStatus | null>(null);

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
    checkStatusAsync();
    console.log('Registering background fetch task');
    registerBackgroundFetchAsync();
    const after = TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK).then(
      (r) => {
        console.log('isRegistered: ', isRegistered);

        if (r) {
          console.log(
            'Task is registered. We should be OK on background events being received'
          );
        } else {
          console.warn(
            'Task is NOT registered. We are NOT set to receive background events'
          );
        }

        setIsRegistered(r);
      }
    );
  }, []);

  const checkStatusAsync = async () => {
    // request permissions for notifications
    await notifee.requestPermission();
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );

    setStatus(status);
    setIsRegistered(isRegistered);
  };

  const toggleFetchTask = async () => {
    if (isRegistered) {
      await unregisterBackgroundFetchAsync();
    } else {
      await registerBackgroundFetchAsync();
    }

    checkStatusAsync();
  };
  /*
  return (
    <View style={styles.screen}>
      <View style={styles.textContainer}>
        <Text>
          Background fetch status:{' '}
          <Text style={styles.boldText}>
            {status && BackgroundFetch.BackgroundFetchStatus[status]}
          </Text>
        </Text>
        <Text>
          Background fetch task name:{' '}
          <Text style={styles.boldText}>
            {isRegistered ? BACKGROUND_FETCH_TASK : 'Not registered yet!'}
          </Text>
        </Text>
      </View>
      <View style={styles.textContainer}></View>
      <Button
        title={isRegistered ? 'Unregister BackgroundFetch task' : 'Register BackgroundFetch task'}
        onPress={toggleFetchTask}
      />
    </View>
  );*/

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webViewRef = useRef<any>();
  const [webViewUrl, setWebViewUrl] = useState(
    `${host}?platform=${Platform.OS}`
  );

  console.log('webViewUrl', webViewUrl);

  const goBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
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
      console.log('in notification event');
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

          console.log(
            'Marked notification as read serverside result ',
            resp.status
          );

          if (resp.status !== 200) {
            console.error('Error marking notification as read ', resp.status);
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

    notifee.onForegroundEvent(handleNotificationEvent);
    notifee.onBackgroundEvent(handleNotificationEvent);
    console.log('Registering background event? ', notifee.onBackgroundEvent);

    return () => {
      console.log('unregistering background event');
      notifee.onForegroundEvent(null);
      notifee.onBackgroundEvent = notifee.onForegroundEvent;
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
        onContentProcessDidTerminate={() => webViewRef.current.reload()}
        mediaPlaybackRequiresUserAction={true}
        source={{ uri: webViewUrl }}
      />

      <Button color={'white'} title={'Back'} onPress={goBack} />

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
console.log('Registering root component');
export default App;