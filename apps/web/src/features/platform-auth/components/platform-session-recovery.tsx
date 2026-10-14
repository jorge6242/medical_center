'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Mounted above the panel layout so SPA reauthentication cannot reload away RAM attempts.
export function PlatformSessionRecovery() {
  const router = useRouter();
  useEffect(() => {
    const recover = () => {
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/platform') || pathname.startsWith('/platform/login')) return;
      router.replace(`/platform/login?redirect=${encodeURIComponent(pathname)}`);
    };
    window.addEventListener('platform-session-expired', recover);
    return () => window.removeEventListener('platform-session-expired', recover);
  }, [router]);
  return null;
}
