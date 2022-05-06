import React, { useEffect } from 'react';
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

  if (!id) {
    return null;
  }

  return (
    <Page
      folders={[new LinkInfo('Create', '/create')]}
      title={world?.name}
    >
      <LevelTable worldId={id.toString()} />
    </Page>
  );
}
