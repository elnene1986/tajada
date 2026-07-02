import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ImportScreen from './src/screens/ImportScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import BackupScreen from './src/screens/BackupScreen';
import MileageScreen from './src/screens/MileageScreen';
import Reconcile1099Screen from './src/screens/Reconcile1099Screen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen, { hasSeenOnboarding } from './src/screens/OnboardingScreen';
import DisclaimerModal from './src/components/DisclaimerModal';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors } from './src/theme';
import { t } from './src/i18n';

var DISCLAIMER_FLAG = FileSystem.documentDirectory + 'disclaimer_seen.flag';

async function hasSeenDisclaimer() {
  try {
    var info = await FileSystem.getInfoAsync(DISCLAIMER_FLAG);
    return info.exists;
  } catch (_) {
    return false;
  }
}

async function markDisclaimerSeen() {
  try {
    await FileSystem.writeAsStringAsync(DISCLAIMER_FLAG, '1');
  } catch (_) {}
}

var Stack = createNativeStackNavigator();

// DEV ONLY: flip to true (and reload) to replay the onboarding
// presentation without clearing app data. Has no effect in production.
var FORCE_ONBOARDING = false;

function MainApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: colors.screenBg },
          headerShadowVisible: false,
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600', fontSize: 16, color: colors.textPrimary },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: colors.screenBg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Import" component={ImportScreen} options={{ title: t('nav.import') }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: t('nav.review') }} />
        <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: t('nav.summary') }} />
        <Stack.Screen name="Backup" component={BackupScreen} options={{ title: t('nav.backup') }} />
        <Stack.Screen name="Mileage" component={MileageScreen} options={{ title: t('nav.mileage') }} />
        <Stack.Screen name="Reconcile1099" component={Reconcile1099Screen} options={{ title: t('nav.reconcile') }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  var [loading, setLoading] = useState(true);
  var [showOnboarding, setShowOnboarding] = useState(false);
  var [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(function() {
    Promise.all([hasSeenOnboarding(), hasSeenDisclaimer()]).then(function(results) {
      var seenOnboarding = results[0];
      var seenDisclaimer = results[1];
      setShowOnboarding((__DEV__ && FORCE_ONBOARDING) || !seenOnboarding);
      setShowDisclaimer(!seenDisclaimer);
      setLoading(false);
    });
  }, []);

  function handleDisclaimerAccept() {
    markDisclaimerSeen();
    setShowDisclaimer(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      {showOnboarding
        ? <OnboardingScreen onDone={function() { setShowOnboarding(false); }} />
        : <MainApp />
      }
      <DisclaimerModal
        visible={!showOnboarding && showDisclaimer}
        onAccept={handleDisclaimerAccept}
      />
    </ErrorBoundary>
  );
}
