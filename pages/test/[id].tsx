import React, { useContext, useEffect } from 'react';
import { AppContext } from '../../contexts/appContext';
import Game from '../../components/level/game';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import useLevelById from '../../hooks/useLevelById';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Test() {
  const { isLoading, user } = useUser();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;
  const { level } = useLevelById(id);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    setIsLoading(!level);
  }, [level, setIsLoading]);

  if (!id || !level || !user || !level.isDraft || level.userId._id !== user._id) {
    return null;
  }

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
        new LinkInfo(level.worldId.name, `/create/${level.worldId._id}`),
        new LinkInfo(level.name, `/edit/${level._id}`),
      ]}
      title={'Test'}
    >
      <Game level={level} />
    </Page>
  );
}
