import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Game from '../../components/level/game';
import GameContainer from '../../components/level/gameContainer';
import Level from '../../models/db/level';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Test() {
  const { isLoading, user } = useUser();
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;
  const [level, setLevel] = useState<Level>();

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

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
        ... level ? [new LinkInfo(level.name, `/edit/${level._id}`)] : [],
      ]}
      title={level ? 'Test' : 'Loading...'}
    >
      {!level ? <></> :
        <GameContainer>
          <Game
            level={level}
            mutateLevel={getLevel}
          />
        </GameContainer>
      }
    </Page>
  );
}
