import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/appContext';
import Control from '../../models/control';
import GameLayout from '../../components/level/gameLayout';
import Level from '../../models/db/level';
import LevelDataType from '../../constants/levelDataType';
import LevelDataTypeModal from '../../components/modal/levelDataTypeModal';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import SizeModal from '../../components/modal/sizeModal';
import cloneLevel from '../../helpers/cloneLevel';
import useLevelById from '../../hooks/useLevelById';
import { useRouter } from 'next/router';
import useUser from '../../hooks/useUser';

export default function Edit() {
  const [isDirty, setIsDirty] = useState(false);
  const { isLoading, user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [level, setLevel] = useState<Level>();
  const [levelDataType, setLevelDataType] = useState(LevelDataType.Default);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;
  const { mutateLevel } = useLevelById(id);

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
    })
    .then(async res => {
      if (res.status === 200) {
        setLevel(await res.json());
      } else {
        throw res.text();
      }
    })
    .catch(err => {
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

  function onClick(index: number) {
    setIsDirty(true);
    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      // there always has to be a start position
      if (prevLevel.data.charAt(index) === LevelDataType.Start) {
        return prevLevel;
      }
      
      // there always has to be an end position
      if (prevLevel.data.charAt(index) === LevelDataType.End &&
        (prevLevel.data.match(new RegExp(LevelDataType.End, 'g')) || []).length === 1) {
        return prevLevel;
      }

      const level = cloneLevel(prevLevel);

      // when changing start position the old position needs to be removed
      if (levelDataType === LevelDataType.Start) {
        const startIndex = level.data.indexOf(LevelDataType.Start);

        level.data = level.data.substring(0, startIndex) + LevelDataType.Default + level.data.substring(startIndex + 1);
      }

      level.data = level.data.substring(0, index) + levelDataType + level.data.substring(index + 1);

      return level;
    });
  }

  function save() {
    if (!level) {
      return;
    }

    setIsLoading(true);

    fetch(`/api/edit/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: level.data,
        height: level.height,
        width: level.width,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
    })
    .then(async res => {
      if (res.status === 200) {
        setIsDirty(false);
        mutateLevel();
        setLevel(prevLevel => {
          if (!prevLevel) {
            return prevLevel;
          }

          const level = cloneLevel(prevLevel);

          level.leastMoves = 0;
          
          return level;
        })
      } else {
        throw res.text();
      }
    })
    .catch(err => {
      console.error(err);
      alert('Error fetching level');
    })
    .finally(() => {
      setIsLoading(false);
    });
  }

  return (
    <Page
      folders={[
        new LinkInfo('Create', '/create'),
        new LinkInfo(level.worldId.name, `/create/${level.worldId._id}`),
      ]}
      title={`${level.name}${isDirty ? '*' : ''}`}
    >
      <>
        <GameLayout
          controls={[
            new Control(() => setIsModalOpen(true), 'Draw'),
            new Control(() => setIsSizeOpen(true), 'Size'),
            new Control(() => save(), 'Save'),
            new Control(() => router.replace(`/test/${id}`), 'Test'),
          ]}
          level={level}
          onClick={onClick}
        />
        <LevelDataTypeModal
          closeModal={() => setIsModalOpen(false)}
          isOpen={isModalOpen}
          levelDataType={levelDataType}
          onChange={(e) => setLevelDataType(e.currentTarget.value)}
        />
        <SizeModal
          closeModal={() => setIsSizeOpen(false)}
          isOpen={isSizeOpen}
          level={level}
          setLevel={setLevel}
        />
      </>
    </Page>
  );
}
