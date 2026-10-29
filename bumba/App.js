import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, BackHandler, Linking, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import bumbaHtml from './bumba-html';

export default function App() {
  const webRef = useRef(null);

  // Android back button: let the app inside the WebView close panels / go back first.
  // It answers 'bumba:exit' (see onMessage) only when there is nothing left to close.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webRef.current) webRef.current.injectJavaScript("window.dispatchEvent(new Event('bumba-back')); true;");
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor="#f7f0e3" />
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: bumbaHtml, baseUrl: 'https://bumba.app/' }}
        onMessage={e => {
          const msg = e.nativeEvent.data || '';
          if (msg === 'bumba:exit') BackHandler.exitApp();
          // Links das provas abrem no browser do telemóvel, não dentro da app.
          else if (msg.startsWith('bumba:open:')) Linking.openURL(msg.slice('bumba:open:'.length)).catch(() => {});
        }}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7f0e3',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || Constants.statusBarHeight) : Constants.statusBarHeight,
  },
  web: { flex: 1, backgroundColor: '#f7f0e3' },
});
