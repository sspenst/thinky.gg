import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Dimensions from '../../constants/dimensions';
import LevelTable from '../../components/levelTable';
import Page from '../../components/page';
import World from '../../models/db/world';
import WorldTable from '../../components/worldTable';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Create() {
  const { isLoading, user } = useUser();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const [worlds, setWorlds] = useState<World[]>();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  const getWorlds = useCallback(() => {
    fetch('/api/worlds', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setWorlds(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching worlds');
    });
  }, []);

  useEffect(() => {
    getWorlds();
  }, [getWorlds]);

  useEffect(() => {
    setIsLoading(!worlds);
  }, [setIsLoading, worlds]);

  if (!worlds) {
    return null;
  }

  return (
    <Page title={'Create'}>
      <>
        <div
          style={{
            marginLeft: Dimensions.TableMargin,
            marginRight: Dimensions.TableMargin,
            marginTop: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          Welcome to the Create page! Here you can create worlds and levels. After creating a level, click on its name to start editing. Once you have finished desgining your level, click the &apos;Test&apos; button to set the level&apos;s least moves, then click publish to make your level available for everyone to play. When publishing a level you can decide if you want it to exist in any of your worlds. Note that a world will not appear in the catalog until it has at least one published level. You can unpublish or delete a level at any time.
        </div>
        <WorldTable getWorlds={getWorlds} worlds={worlds} />
        <LevelTable worlds={worlds} />
      </>
    </Page>
  );
}
