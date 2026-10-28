import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { photoUrl } from '@/lib/sync/cloud';

/**
 * The best way to show a photo right now. A stored copy wins on web (blob
 * links die on reload) and whenever the local file is gone; otherwise the
 * local file shows instantly while the upload catches up.
 */
export function usePhoto(localUri?: string, path?: string): string | undefined {
  const preferLocal = Platform.OS !== 'web' && localUri && !localUri.startsWith('blob:');
  const [remote, setRemote] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!path || preferLocal) return;
    let active = true;
    void photoUrl(path).then((url) => active && url && setRemote({ path, url }));
    return () => {
      active = false;
    };
  }, [path, preferLocal]);

  if (preferLocal) return localUri;
  if (path && remote?.path === path) return remote.url;
  return path ? undefined : localUri;
}
