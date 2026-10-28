import { Redirect } from 'expo-router';

import { useProfile } from '@/lib/profile/ProfileContext';

/** First launch goes through the Homebase onboarding; after that, straight to Home. */
export default function Index() {
  const { profile, loaded } = useProfile();
  if (!loaded) return null;
  return <Redirect href={profile.onboardedAt ? '/home' : '/onboarding'} />;
}
