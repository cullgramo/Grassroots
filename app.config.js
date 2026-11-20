// The app's settings are in app.json. This file adds the one setting that must not be written into the code:
// the Google Maps key for the Android app.
//
// On Android the phone app's map is Google's, and an installed app needs its own key or the map shows blank
// (Expo Go carries a key of its own, which is why the map works there without one). The key is entered on expo.dev
// (Project settings, Environment variables) under the name GOOGLE_MAPS_ANDROID_KEY, and Expo's build reads it from
// there. With no key set, nothing is added and everything else builds as before. See docs/store-builds.md.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (!key) return config;
  return { ...config, plugins: [...(config.plugins ?? []), ['react-native-maps', { androidGoogleMapsApiKey: key }]] };
};
