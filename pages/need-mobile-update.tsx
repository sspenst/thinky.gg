/* istanbul ignore file */
import Page from '@root/components/page/page';
import { AppContext } from '@root/contexts/appContext';
import React, { useContext } from 'react';

export default function NeedMobileUpdate() {
  const { deviceInfo, game } = useContext(AppContext);

  return (
    <Page title={game.displayName}>
      <div className='flex flex-col items-center gap-4 py-24 px-4'>
        <h2 className='text-2xl font-medium'>
          Mobile app out of date!
        </h2>
        {deviceInfo.isIOS &&
          <span>
            Please update to the latest iOS version <a className='hover:underline text-blue-500' href='https://apps.apple.com/app/pathology-block-pushing-game/id1668925562' rel='noreferrer' target='_blank'>here</a>.
          </span>
        }
        {deviceInfo.isAndroid &&
          <span>
            Please update to the latest Android version <a className='hover:underline text-blue-500' href='https://play.google.com/store/apps/details?id=com.pathology.gg' rel='noreferrer' target='_blank'>here</a>.
          </span>
        }
      </div>
    </Page>
  );
}
