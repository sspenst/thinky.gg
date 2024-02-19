'use client';
import Tracker from '@openreplay/tracker';
import { AppContext } from '@root/contexts/appContext';
import { useContext, useEffect } from 'react';

const trackerInstance = new Tracker({
  projectKey: 'GHKiOCFt7Tg49Fi2oyHM',
  //ingestPoint: '****',
  //__DISABLE_SECURE_MODE: true,
  network: {
    capturePayload: true,
    failuresOnly: false,
    ignoreHeaders: ['Cookie', 'Set-Cookie', 'Authorization'],
    sessionTokenHeader: false,
    captureInIframes: false,
  }
});

const OpenReplayWrapper = () => {
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dateRegistered = user?.ts ? new Date(user?.ts * 1000) : null;
      // if user is anonymous or if date registered is last 3 days, then we should init track
      const shouldInitTrack = !user || (user && dateRegistered && dateRegistered < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));

      if (shouldInitTrack) {
        trackerInstance.start().then(() => {
          console.log('OpenReplay started');

          if (user) {
            trackerInstance.setUserID(user.name);
            trackerInstance.setMetadata('_id', user._id.toString());
          }
        });
      }
    }
  }, [user]);

  return null;
};

export default OpenReplayWrapper;
