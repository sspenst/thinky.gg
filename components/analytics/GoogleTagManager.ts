import { pageview } from '@root/lib/gtm';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const GoogleTagManager = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    router.events.on('routeChangeComplete', pageview);

    return () => {
      router.events.off('routeChangeComplete', pageview);
    };
  }, [router.events]);

  return children;
};

export default GoogleTagManager;
