import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AppContext } from '../contexts/appContext';
import Control from '../models/control';
import GameLayout from '../components/level/gameLayout';
import Level from '../models/db/level';
import LevelDataType from '../constants/levelDataType';
import LevelDataTypeModal from '../components/modal/levelDataTypeModal';
import { PageContext } from '../contexts/pageContext';
import SizeModal from '../components/modal/sizeModal';
import cloneLevel from '../helpers/cloneLevel';
import levelDataTypeToString from '../constants/levelDataTypeToString';
import useLevelById from '../hooks/useLevelById';
import { useRouter } from 'next/router';

interface EditorProps {
  isDirty: boolean;
  level: Level | undefined;
  setIsDirty: (isDirty: boolean) => void;
  setLevel: React.Dispatch<React.SetStateAction<Level | undefined>>;
}

export default function Editor({ isDirty, level, setIsDirty, setLevel }: EditorProps) {
  const [isLevelDataTypeOpen, setIsLevelDataTypeOpen] = useState(false);
  const { isModalOpen } = useContext(PageContext);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [levelDataType, setLevelDataType] = useState(LevelDataType.Wall);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;
  const { mutateLevel } = useLevelById(id);

  const handleKeyDown = useCallback(code => {
    switch (code) {
    case 'Digit0':
      setLevelDataType(LevelDataType.Default);
      break;
    case 'Digit1':
      setLevelDataType(LevelDataType.Wall);
      break;
    case 'Digit2':
      setLevelDataType(LevelDataType.Block);
      break;
    case 'Digit3':
      setLevelDataType(LevelDataType.End);
      break;
    case 'Digit4':
      setLevelDataType(LevelDataType.Start);
      break;
    case 'Digit5':
      setLevelDataType(LevelDataType.Hole);
      break;
    case 'Digit6':
      setLevelDataType(LevelDataType.Left);
      break;
    case 'Digit7':
      setLevelDataType(LevelDataType.Up);
      break;
    case 'Digit8':
      setLevelDataType(LevelDataType.Right);
      break;
    case 'Digit9':
      setLevelDataType(LevelDataType.Down);
      break;
    case 'KeyA':
      setLevelDataType(LevelDataType.Upleft);
      break;
    case 'KeyB':
      setLevelDataType(LevelDataType.Upright);
      break;
    case 'KeyC':
      setLevelDataType(LevelDataType.Downright);
      break;
    case 'KeyD':
      setLevelDataType(LevelDataType.Downleft);
      break;
    default:
      break;
    }
  }, []);

  const handleKeyDownEvent = useCallback(event => {
    if (!isModalOpen && !isSizeOpen) {
      const { code } = event;
      handleKeyDown(code);
    }
  }, [handleKeyDown, isModalOpen, isSizeOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [handleKeyDownEvent]);

  function onClick(index: number, clear: boolean) {
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
      const newLevelDataType = clear ? LevelDataType.Default : levelDataType;

      // when changing start position the old position needs to be removed
      if (newLevelDataType === LevelDataType.Start) {
        const startIndex = level.data.indexOf(LevelDataType.Start);

        level.data = level.data.substring(0, startIndex) + LevelDataType.Default + level.data.substring(startIndex + 1);
      }

      level.data = level.data.substring(0, index) + newLevelDataType + level.data.substring(index + 1);

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
    }).then(async res => {
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
        });
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      alert('Error fetching level');
    }).finally(() => {
      setIsLoading(false);
    });
  }

  if (!id || !level) {
    return null;
  }

  return (<>
    <GameLayout
      controls={[
        new Control(() => setIsLevelDataTypeOpen(true), levelDataTypeToString[levelDataType]),
        new Control(() => setIsSizeOpen(true), 'Size'),
        new Control(() => save(), 'Save'),
        new Control(() => router.replace(`/test/${id}`), 'Test', isDirty),
      ]}
      level={level}
      onClick={onClick}
    />
    <LevelDataTypeModal
      closeModal={() => setIsLevelDataTypeOpen(false)}
      isOpen={isLevelDataTypeOpen}
      levelDataType={levelDataType}
      onChange={(e) => setLevelDataType(e.currentTarget.value)}
    />
    <SizeModal
      closeModal={() => {
        setIsSizeOpen(false);
        setIsDirty(true);
      }}
      isOpen={isSizeOpen}
      level={level}
      setLevel={setLevel}
    />
  </>);
}
