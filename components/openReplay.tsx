import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import type { OpenReplayWrapperProps } from './openReplayWrapper';

const subscribeToEligibility = (_onStoreChange: () => void) => () => undefined;

export function isOpenReplayEligible() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (new URLSearchParams(window.location.search).get('utm_source')) {
    return true;
  }

  try {
    return window.localStorage.getItem('utm_source') !== null;
  } catch {
    return false;
  }
}

const OpenReplayWrapper = dynamic<OpenReplayWrapperProps>(
  () => import('./openReplayWrapper'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function Openreplay() {
  const isEligible = useSyncExternalStore(
    subscribeToEligibility,
    isOpenReplayEligible,
    () => false,
  );

  return isEligible ? <OpenReplayWrapper isEligible={isEligible} /> : null;
}
