'use client';
import Tracker from '@openreplay/tracker';
import { AppContext } from '@root/contexts/appContext';
import User from '@root/models/db/user';
import { useContext, useEffect, useState } from 'react';

const trackerInstance = new Tracker({
  projectKey: 'GHKiOCFt7Tg49Fi2oyHM',
  //ingestPoint: '****',
  __DISABLE_SECURE_MODE: true,
  network: {
    capturePayload: true,
    failuresOnly: false,
    ignoreHeaders: ['Cookie', 'Set-Cookie', 'Authorization'],
    sessionTokenHeader: false,
    captureInIframes: false,
  }
});

const Openreplay = () => {
  const { user } = useContext(AppContext);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackerInstance.start().then(() => {
        console.log('OpenReplay started');

        if (user) {
          trackerInstance.setUserID(user._id.toString());
          trackerInstance.setMetadata('name', user.name);
        }
      });
    }
  }, [user]);

  return null;
};

export default Openreplay;
