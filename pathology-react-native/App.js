import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Button, Dimensions, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';

const BACKGROUND_FETCH_TASK = 'background-fetch';

// 1. Define the task by providing a name and the function that should be executed
// Note: This needs to be called in the global scope (e.g outside of your React components)
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const now = Date.now();

  console.log(`Got background fetch call at date: ${new Date(now).toISOString()}`);

  // create a notification, link to pathology.gg/notifications
  const notif = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Background fetch notification',
      body: `Got background fetch call at date: ${new Date(now).toISOString()}`,
      data: { url: 'https://pathology.gg/notifications' }
    },
    trigger: {
      seconds: 1,
    }

  });

  console.log('Notification scheduled: ', notif);

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
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    checkStatusAsync();
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

  const webViewRef = React.useRef();
  const [loading, setLoading] = React.useState(false);
  const [url, setUrl] = React.useState('https://pathology.gg?platform=' + platform);
  const goBack = () => {
    webViewRef.current.goBack();
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
  const responseListener = React.useRef();

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;

      console.log('DATA', data);
      if (!data) return;

      const { url } = data;

      if (url) {
        console.log(webViewRef.current);
        setUrl(url);
        console.log('after', webViewRef.current);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const platform = Platform.OS;

  return (
    <SafeAreaView style={{ flex: 1 }}
      backgroundColor="black"
    >

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
        onContentProcessDidTerminate={() => webViewRef.reload()}
        mediaPlaybackRequiresUserAction={true}

        source={{ uri: url }} />

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
