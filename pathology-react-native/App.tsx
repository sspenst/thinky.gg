import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Button, Dimensions, Platform, SafeAreaView } from 'react-native';
import WebView from 'react-native-webview';
import AchievementInfo from '../constants/achievementInfo';
import NotificationType from '../constants/notificationType';
import { EnrichedLevel } from '../models/db/level';
import Notification from '../models/db/notification';
import User from '../models/db/user';

// TODO:
// unread notification API
// - save ts that the notification was called in a state
// - pass in ts to API, filter > ts to never repeat notifications
// - don't update last_visited_at in withAuth for this API
// app icons
// notification icons
// push notification settings (turn notifications off/on)
// test android

export async function getNotificationString(username: string, notification: Notification) {
  const targetLevel = notification.target as EnrichedLevel;
  const targetUser = notification.target as User;

  switch (notification.type) {
  case NotificationType.NEW_ACHIEVEMENT:
    if (notification.source) {
      const achievement = notification.source;

      return [`Achievement unlocked! ${AchievementInfo[achievement.type].description}`, 'https://pathology.gg/profile/' + username + '/achievements'];
    }

    return ['Unknown achievement', 'https://pathology.gg/profile/' + username + '/achievements'];

  case NotificationType.NEW_FOLLOWER:
    return [notification.source.name + ' started following you', 'https://pathology.gg/profile/' + notification.source.name];

  case NotificationType.NEW_LEVEL:
    return [notification.source.name + ` published a new level: ${targetLevel.name}`, `https://pathology.gg/level/${targetLevel.slug}`];

  case NotificationType.NEW_RECORD_ON_A_LEVEL_YOU_BEAT:
    return [notification.source.name + ` set a new record: ${targetLevel.name} - ${(notification.message)} moves', 'https://pathology.gg/level/${targetLevel.slug}`];

  case NotificationType.NEW_REVIEW_ON_YOUR_LEVEL:
    return [notification.source.name + ` wrote a ${isNaN(Number(notification.message)) ? notification.message : Number(notification.message) > 0 ? `${Number(notification.message)} stars` : undefined} review on your level ${targetLevel.name}`, `https://pathology.gg/level/${targetLevel.slug}`];

  case NotificationType.NEW_WALL_POST: {
    const comment = notification.message ? JSON.parse(notification.message) : null;

    const shortenedText = comment ? (comment.text.length > 10 ? comment.text.substring(0, 10) + '...' : comment.text) : '';

    return [notification.source.name + ` posted "${shortenedText}" on your profile.`, `https://pathology.gg/profile/${username}`];
  }

  case NotificationType.NEW_WALL_REPLY: {
    const comment = notification.message ? JSON.parse(notification.message) : null;

    const shortenedText = comment ? (comment.text.length > 10 ? comment.text.substring(0, 10) + '...' : comment.text) : '';

    return [notification.source.name + ` replied "${shortenedText}" to your message on ${targetUser.name}'s profile.`, `https://pathology.gg/profile/${targetUser.name}`];
  }

  default:
    return ['Unknown', 'https://pathology.gg/notifications'];
  }
}

const BACKGROUND_FETCH_TASK = 'background-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  // make a network request to https://pathology.gg/api/user
  const response = await fetch('https://pathology.gg/api/user', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

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

  // check if length of notifications array is greater than 0
  if (data.notifications.length === 0) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // filter out notifications that have already been seen
  const unseenNotifications = data.notifications.filter((notif: any) => !notif.read);

  // if only one notification then write out more explicitly what the notif is
  let body = 'You have ' + unseenNotifications.length + ' unread notifications';
  let url = 'https://pathology.gg/notifications?filter=unread';

  if (unseenNotifications.length === 0) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  if (unseenNotifications.length === 1) {
    const notif = unseenNotifications[0];

    const arr = getNotificationString(data.name, notif);
    // "_A": null, "_x": 0, "_y": 1, "_z": due to the fact that the array is not a normal array
    // but a react native array, we need to convert it to a normal array to use map
    const converted = (arr as any)._z;

    body = converted[0];
    url = converted[1];
  }

  // create a notification, link to pathology.gg/notifications
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Notification',
      body: body,
      data: { url: url }
    },
    trigger: {
      seconds: 1,
    }

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

export default function BackgroundFetchScreen() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState<BackgroundFetch.BackgroundFetchStatus | null>(null);

  useEffect(() => {
    checkStatusAsync();
    registerBackgroundFetchAsync();
  }, []);

  const checkStatusAsync = async () => {
    // request permissions for notifications
    await Notifications.requestPermissionsAsync();
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);

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

  const webViewRef = useRef<any>();
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('https://pathology.gg?platform=' + Platform.OS);
  const goBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  };
  const onAndroidBackPress = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();

      return true; // prevent default behavior (exit app)
    }

    return false;
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onAndroidBackPress);
      };
    }
  }, []);
  const responseListener = useRef<any>();

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;

      if (!data) return;

      const { url } = data;

      if (url) {
        setUrl(url as string);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <WebView
        originWhitelist={['*']}
        ref={webViewRef}
        style={{

        }}
        containerStyle={{ backgroundColor: 'black' }}

        sharedCookiesEnabled={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        allowFileAccess={true}
        allowsInlineMediaPlayback={true}
        allowsFullscreenVideo={ false }
        renderLoading={() => <ActivityIndicator size="large" color="red" />}

        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress !== 1) {
            setLoading(true);
          } else if (nativeEvent.progress === 1 ) {
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

        source={{ uri: url }}
      />

      <Button color={'white'} title={'Back'} onPress={goBack}
      />

      {loading &&
      <ActivityIndicator
        style={{ position: 'absolute', top: SCREEN_HEIGHT / 2, left: SCREEN_WIDTH / 2,
          zIndex: 9999,
          transform: [{ translateX: -25 }, { translateY: -25 }]
        }}
        size="large"
      />
      }

    </SafeAreaView>

  );
}
