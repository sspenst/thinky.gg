import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import CollectionTable from '../../components/collectionTable';
import LevelTable from '../../components/levelTable';
import Page from '../../components/page';
import Dimensions from '../../constants/dimensions';
import { AppContext } from '../../contexts/appContext';
import useUser from '../../hooks/useUser';
import Collection from '../../models/db/collection';
import Level from '../../models/db/level';

export default function Create() {
  const [collections, setCollections] = useState<Collection[]>();
  const { isLoading, user } = useUser();
  const [levels, setLevels] = useState<Level[]>();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

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
      console.error(err);
      alert('Error fetching levels');
    });
  }, []);

  const getCollections = useCallback(() => {
    fetch('/api/collections', {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setCollections(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching collections');
    });
  }, []);

  useEffect(() => {
    getLevels();
  }, [getLevels]);

  useEffect(() => {
    getCollections();
  }, [getCollections]);

  useEffect(() => {
    setIsLoading(!levels || !collections);
  }, [levels, setIsLoading, collections]);

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
          Welcome to the Create page! Here you can create collections and levels. After creating a level, click on its name to start editing. Once you have finished desgining your level, click the &apos;Test&apos; button to set the level&apos;s least moves, then click publish to make your level available for everyone to play. When publishing a level you can decide if you want it to exist in any of your collections. Note that a collection will not appear in the catalog until it has at least one published level. You can unpublish or delete a level at any time.
        </div>
        <CollectionTable collections={collections} getCollections={getCollections} />
        <LevelTable collections={collections} getCollections={getCollections} getLevels={getLevels} levels={levels} />
      </>
    </Page>
  );
}
