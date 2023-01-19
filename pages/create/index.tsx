import { GetServerSidePropsContext } from 'next';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import LevelTable from '../../components/levelTable';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';
import redirectToLogin from '../../helpers/redirectToLogin';
import Level from '../../models/db/level';

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await redirectToLogin(context);
}

/* istanbul ignore next */
export default function Create() {
  const [levels, setLevels] = useState<Level[]>();
  const { setIsLoading } = useContext(AppContext);

  const getLevels = useCallback(() => {
    fetch('/api/levels', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setLevels(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.trace(err);
      toast.dismiss();
      toast.error('Error fetching levels');
    });
  }, []);

  useEffect(() => {
    getLevels();
  }, [getLevels]);

  useEffect(() => {
    setIsLoading(!!levels);
  }, [levels, setIsLoading]);

  return (
    <Page title={'Create'}>
      <div className='flex flex-col gap-5 m-5'>
        <div className='text-center'>
          Welcome to the Create page! Here you can create levels. After creating a level, click on its name to start editing. Once you have finished designing your level, click the &apos;Test&apos; button to set the level&apos;s least moves, then click publish to make your level available for everyone to play. You can unpublish or delete a level at any time.
        </div>
        {!levels ?
          <div className='flex justify-center'>Loading levels...</div> :
          <LevelTable getLevels={getLevels} levels={levels} />
        }
      </div>
    </Page>
  );
}
