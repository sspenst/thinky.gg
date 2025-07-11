import dynamic from 'next/dynamic';

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
