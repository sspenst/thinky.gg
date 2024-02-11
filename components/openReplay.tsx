import dynamic from 'next/dynamic';
import React from 'react';

const OpenreplayWrapper = dynamic(
  () => import('./OpenReplayWrapper'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function Openreplay() {
  return <OpenreplayWrapper />;
}
