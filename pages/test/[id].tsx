/* istanbul ignore file */
/* If we ever add a getStaticProps or getServerProps then remove the ignore file and just ignore next on the default export */
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Game from '../../components/level/game';
import LayoutContainer from '../../components/level/layoutContainer';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';

export default function Test() {
  const [isLevelLoading, setIsLevelLoading] = useState(true);
  const [level, setLevel] = useState<Level>();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;

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
        ... level ? [new LinkInfo(level.name, `/edit/${level._id}`)] : [],
      ]}
      title={isLevelLoading ? 'Loading...' : 'Test'}
    >
      {isLevelLoading ? <></> : !level ? <>ERROR</> :
        <LayoutContainer>
          <Game
            level={level}
            mutateLevel={getLevel}
          />
        </LayoutContainer>
      }
    </Page>
  );
}
