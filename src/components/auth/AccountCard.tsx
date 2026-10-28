import { Image } from 'expo-image';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth/AuthContext';

/** Google account status, with sign in and sign out. */
export function AccountCard() {
  const auth = useAuth();
  const signIn = () => auth.signIn().catch((e: Error) => Alert.alert('Sign-in failed', e.message));

  return (
    <View className="gap-3 rounded-[26px] border border-line bg-card p-4">
      <T variant="label">Google account</T>
      {auth.account ? (
        <>
          <View className="flex-row items-center gap-3">
            {auth.account.photo ? (
              <Image source={{ uri: auth.account.photo }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-forest">
                <T variant="heading" className="text-[#F8F4EA]">
                  {(auth.account.name ?? auth.account.email)[0].toUpperCase()}
                </T>
              </View>
            )}
            <View className="flex-1">
              <T variant="heading">{auth.account.name ?? auth.account.email}</T>
              <T variant="small">{auth.account.email} · Calendar connected</T>
            </View>
          </View>
          <Button label="Sign out" kind="quiet" onPress={() => void auth.signOut()} />
        </>
      ) : (
        <>
          <T variant="muted">
            {auth.configured
              ? 'Sign in to sync trips to your account and write them into Google Calendar.'
              : 'Google sign-in isn’t set up yet: add your Google client IDs to .env.local.'}
          </T>
          <Button label={auth.restoring ? 'Checking…' : 'Sign in with Google'} disabled={!auth.configured || auth.restoring} onPress={() => void signIn()} />
        </>
      )}
    </View>
  );
}
