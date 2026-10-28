import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the static config; this file only fills in values that
// come from the environment. The Google sign-in plugin needs the iOS URL
// scheme from your Google Cloud iOS OAuth client ("reversed client ID"),
// e.g. com.googleusercontent.apps.1234-abcd. Set GOOGLE_IOS_URL_SCHEME in
// .env.local (and as an EAS secret for cloud builds).
const GOOGLE_SIGNIN = '@react-native-google-signin/google-signin';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'ndtm',
  slug: config.slug ?? 'ndtm',
  plugins: (config.plugins ?? []).map((plugin) =>
    plugin === GOOGLE_SIGNIN
      ? [GOOGLE_SIGNIN, { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.replace-me' }]
      : plugin,
  ),
});
