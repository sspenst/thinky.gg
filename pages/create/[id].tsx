import React, { useEffect } from 'react';
import Dimensions from '../../constants/dimensions';
import LevelTable from '../../components/levelTable';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';
import useWorldById from '../../hooks/useWorldById';

export default function Create() {
  const { isLoading, user } = useUser();
  const router = useRouter();
  const { id } = router.query;
  const { world } = useWorldById(id);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  if (!id || !world || !user || world.userId._id !== user._id) {
    return null;
  }

  return (
    <Page
      folders={[new LinkInfo('Create', '/create')]}
      title={world.name}
    >
      <>
        <div
          style={{
            marginLeft: Dimensions.TableMargin,
            marginRight: Dimensions.TableMargin,
            marginTop: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          Welcome to the level creation page! After creating a level, click on its name to start editing. Once you have finished desgining your level, click the &apos;Test&apos; button to set the level&apos;s least moves, then click publish to make your level available for everyone to play. You can unpublish or delete a level at any time.
        </div>
        <LevelTable worldId={id.toString()} />
      </>
    </Page>
  );
}
