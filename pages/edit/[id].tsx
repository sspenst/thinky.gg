import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Editor from '../../components/editor';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Edit() {
  const [isDirty, setIsDirty] = useState(false);
  const { isLoading, user } = useUser();
  const [level, setLevel] = useState<Level>();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [isLoading, router, user]);

  const getLevel = useCallback(() => {
    if (!id) {
      return;
    }

    fetch(`/api/level/${id}`, {
      method: 'GET',
    }).then(async res => {
      if (res.status === 200) {
        setLevel(await res.json());
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching level');
    });
  }, [id]);

  useEffect(() => {
    getLevel();
  }, [getLevel]);

  useEffect(() => {
    setIsLoading(!level);

    if (level && !level.isDraft) {
      router.replace('/');
    }
  }, [level, router, setIsLoading]);

  if (!id || !level) {
    return null;
  }

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
        new LinkInfo(level.worldId.name, `/create/${level.worldId._id}`),
      ]}
      title={`${level.name}${isDirty ? '*' : ''}`}
    >
      <Editor
        level={level}
        setIsDirty={setIsDirty}
        setLevel={setLevel}
      />
    </Page>
  );
}
