import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Editor from '../../components/editor';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import toast from 'react-hot-toast';
import useNavigatePrompt from '../../hooks/useNavigatePrompt';
import { useRouter } from 'next/router';

export default function Edit() {
  const [isDirty, setIsDirty] = useState(false);
  const [isLevelLoading, setIsLevelLoading] = useState(true);
  const [level, setLevel] = useState<Level>();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;

  useNavigatePrompt(isDirty);

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
    }).catch(async err => {
      const error = await err;

      console.error(error);
      toast.error(`Error: ${JSON.parse(error)?.error}`);
    }).finally(() => {
      setIsLevelLoading(false);
    });
  }, [id]);

  useEffect(() => {
    getLevel();
  }, [getLevel]);

  useEffect(() => {
    setIsLoading(isLevelLoading);
  }, [isLevelLoading, setIsLoading]);

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
      ]}
      title={isLevelLoading ? 'Loading...' : level ? `${level.name}${isDirty ? '*' : ''}` : 'Error'}
    >
      {isLevelLoading ? <></> : !level ? <>ERROR</> :
        <Editor
          isDirty={isDirty}
          level={level}
          setIsDirty={setIsDirty}
          setLevel={setLevel}
        />
      }
    </Page>
  );
}
