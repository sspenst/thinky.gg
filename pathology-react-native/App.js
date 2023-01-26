import React, { useEffect } from 'react';
import { ActivityIndicator, BackHandler, Button, Dimensions, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  const webViewRef = React.useRef();
  const [loading, setLoading] = React.useState(false);

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

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const [loadingPercent, setLoadingPercent] = React.useState(0);
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
          setLoadingPercent(nativeEvent.progress);

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

        source={{ uri: 'https://pathology.gg?platform=' + platform }} />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
