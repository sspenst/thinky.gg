import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import SizeModal from '../components/modal/sizeModal';
import LevelDataType from '../constants/levelDataType';
import Theme from '../constants/theme';
import { AppContext } from '../contexts/appContext';
import { PageContext } from '../contexts/pageContext';
import isTheme from '../helpers/isTheme';
import Control from '../models/control';
import Level from '../models/db/level';
import { teko } from '../pages/_app';
import EditorLayout from './level/editorLayout';
import Square from './level/square';
import DataModal from './modal/dataModal';
import PublishLevelModal from './modal/publishLevelModal';

interface EditorProps {
  isDirty: boolean;
  level: Level;
  setIsDirty: (isDirty: boolean) => void;
  setLevel: React.Dispatch<React.SetStateAction<Level | undefined>>;
}

export default function Editor({ isDirty, level, setIsDirty, setLevel }: EditorProps) {
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [levelDataType, setLevelDataType] = useState(LevelDataType.Default);
  const { preventKeyDownEvent } = useContext(PageContext);
  const router = useRouter();
  const { setIsLoading } = useContext(AppContext);
  const { id } = router.query;

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
      setLevelDataType(LevelDataType.UpLeft);
      break;
    case 'KeyB':
      setLevelDataType(LevelDataType.UpRight);
      break;
    case 'KeyC':
      setLevelDataType(LevelDataType.DownRight);
      break;
    case 'KeyD':
      setLevelDataType(LevelDataType.DownLeft);
      break;
    case 'KeyE':
      setLevelDataType(LevelDataType.NotLeft);
      break;
    case 'KeyF':
      setLevelDataType(LevelDataType.NotUp);
      break;
    case 'KeyG':
      setLevelDataType(LevelDataType.NotRight);
      break;
    case 'KeyH':
      setLevelDataType(LevelDataType.NotDown);
      break;
    case 'KeyI':
      setLevelDataType(LevelDataType.LeftRight);
      break;
    case 'KeyJ':
      setLevelDataType(LevelDataType.UpDown);
      break;
    default:
      break;
    }
  }, []);

  const handleKeyDownEvent = useCallback(event => {
    if (!isDataOpen && !isSizeOpen && !preventKeyDownEvent) {
      const { code } = event;

      handleKeyDown(code);
    }
  }, [handleKeyDown, isDataOpen, isSizeOpen, preventKeyDownEvent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [handleKeyDownEvent]);

  function onClick(index: number, rightClick: boolean) {
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

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      let clear = rightClick;

      if (levelDataType === prevLevel.data.charAt(index)) {
        clear = true;
      }

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
    setIsLoading(true);
    toast.loading('Saving...');

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
        setLevel(prevLevel => {
          if (!prevLevel) {
            return prevLevel;
          }

          const level = JSON.parse(JSON.stringify(prevLevel)) as Level;

          level.leastMoves = 0;

          return level;
        });
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching level');
    }).finally(() => {
      toast.dismiss();
      toast.success('Saved');
      setIsLoading(false);
    });
  }

  if (!id) {
    return null;
  }

  const listBlockChoices = [];
  const size = 40;

  for (const levelDataTypeKey in LevelDataType.toString()) {
    let txt = undefined;

    if (levelDataTypeKey === LevelDataType.End) {
      txt = level.leastMoves;
    } else if (levelDataTypeKey === LevelDataType.Start) {
      txt = 0;
    }

    listBlockChoices.push(
      <div
        key={`level-data-type-${levelDataTypeKey}`}
        style={{
          borderColor: levelDataType === levelDataTypeKey ? 'var(--level-grid-text-extra)' : 'var(--bg-color)',
          borderWidth: levelDataType === levelDataTypeKey ? 3 : 1,
          height: size,
          width: size,
        }}
      >
        <Square
          borderWidth={1}
          leastMoves={0}
          levelDataType={levelDataTypeKey}
          noBoxShadow={true}
          onClick={() => setLevelDataType(levelDataTypeKey)}
          size={size - (levelDataType === levelDataTypeKey ? 4 : 0)}
          text={txt}
        />
      </div>
    );
  }

  const blockList = <>{ listBlockChoices }</>;

  return (<>
    <div className='flex flex-col h-full'>
      <div className={classNames('flex flex-wrap shrink-0', { [teko.className]: isTheme(Theme.Classic) })} id='editor-block-list'>
        <div
          className='mt-1 border-2 rounded-md p-1 m-auto lg:flex lg:flex-rows grid grid-cols-10'
          style={{
            borderColor: 'var(--color)',
          }}
        >
          {blockList}
        </div>
      </div>
      <EditorLayout
        controls={[
          new Control('btn-size', () => setIsSizeOpen(true), <>Size</>),
          new Control('btn-data', () => setIsDataOpen(true), <>Data</>),
          new Control('btn-save', () => save(), <>Save</>),
          new Control('btn-test', () => router.push(`/test/${id}`), <>Test</>, isDirty),
          new Control('btn-publish', () => setIsPublishLevelOpen(true), <>Publish</>, isDirty || level.leastMoves === 0),
        ]}
        level={level}
        onClick={onClick}
      />
    </div>
    <SizeModal
      closeModal={() => setIsSizeOpen(false)}
      isOpen={isSizeOpen}
      level={level}
      setIsDirty={() => setIsDirty(true)}
      setLevel={setLevel}
    />
    <DataModal
      closeModal={() => setIsDataOpen(false)}
      isOpen={isDataOpen}
      level={level}
      setIsDirty={() => setIsDirty(true)}
      setLevel={setLevel}
    />
    <PublishLevelModal
      closeModal={() => setIsPublishLevelOpen(false)}
      isOpen={isPublishLevelOpen}
      level={level}
      onPublish={() => router.push('/create')}
    />
  </>);
}
