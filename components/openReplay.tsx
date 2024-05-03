import dynamic from 'next/dynamic';
import React from 'react';

const OpenReplayWrapper = dynamic(
  () => import('./openReplayWrapper'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function Openreplay() {
  return <OpenReplayWrapper />;
}
