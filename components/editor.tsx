import LevelUtil from '@root/constants/LevelUtil';
import classNames from 'classnames';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ModifyModal from '../components/modal/modifyModal';
import SizeModal from '../components/modal/sizeModal';
import Theme from '../constants/theme';
import { TileType } from '../constants/tileType';
import { PageContext } from '../contexts/pageContext';
import isTheme from '../helpers/isTheme';
import Control from '../models/control';
import Level from '../models/db/level';
import { teko } from '../pages/_app';
import BasicLayout from './level/basicLayout';
import Square from './level/square';
import CreateLevelModal from './modal/createLevelModal';
import DataModal from './modal/dataModal';
import PublishLevelModal from './modal/publishLevelModal';

interface EditorProps {
  isDirty: boolean;
  level: Level;
  setIsDirty: (isDirty: boolean) => void;
  setLevel: React.Dispatch<React.SetStateAction<Level>>;
}

export default function Editor({ isDirty, level, setIsDirty, setLevel }: EditorProps) {
  const history = useRef<Level[]>([level]);
  const historyIndex = useRef<number>(0);
  const [isCreateLevelOpen, setIsCreateLevelOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [levelDataType, setLevelDataType] = useState<TileType>(TileType.Default);
  const { preventKeyDownEvent } = useContext(PageContext);
  const router = useRouter();
  const { id } = router.query;

  const undo = useCallback(() => {
    if (historyIndex.current === 0) {
      return;
    }

    historyIndex.current--;
    setLevel(history.current[historyIndex.current]);
    setIsDirty(true);
  }, [setIsDirty, setLevel]);

  const redo = useCallback(() => {
    if (historyIndex.current === history.current.length - 1) {
      return;
    }

    historyIndex.current++;
    setLevel(history.current[historyIndex.current]);
    setIsDirty(true);
  }, [setIsDirty, setLevel]);

  const handleKeyDown = useCallback((code: string) => {
    switch (code) {
    case 'Digit0':
      setLevelDataType(TileType.Default);
      break;
    case 'Digit1':
      setLevelDataType(TileType.Wall);
      break;
    case 'Digit2':
      setLevelDataType(TileType.Block);
      break;
    case 'Digit3':
      setLevelDataType(TileType.End);
      break;
    case 'Digit4':
      setLevelDataType(TileType.Start);
      break;
    case 'Digit5':
      setLevelDataType(TileType.Hole);
      break;
    case 'Digit6':
      setLevelDataType(TileType.Left);
      break;
    case 'Digit7':
      setLevelDataType(TileType.Up);
      break;
    case 'Digit8':
      setLevelDataType(TileType.Right);
      break;
    case 'Digit9':
      setLevelDataType(TileType.Down);
      break;
    case 'KeyA':
      setLevelDataType(TileType.UpLeft);
      break;
    case 'KeyB':
      setLevelDataType(TileType.UpRight);
      break;
    case 'KeyC':
      setLevelDataType(TileType.DownRight);
      break;
    case 'KeyD':
      setLevelDataType(LevelUtil.DownLeft);
      break;
    case 'KeyE':
      setLevelDataType(LevelUtil.NotLeft);
      break;
    case 'KeyF':
      setLevelDataType(LevelUtil.NotUp);
      break;
    case 'KeyG':
      setLevelDataType(LevelUtil.NotRight);
      break;
    case 'KeyH':
      setLevelDataType(LevelUtil.NotDown);
      break;
    case 'KeyI':
      setLevelDataType(LevelUtil.LeftRight);
      break;
    case 'KeyJ':
      setLevelDataType(LevelUtil.UpDown);
      break;
    case 'KeyZ':
      undo();
      break;
    case 'KeyU':
      undo();
      break;
    case 'KeyR':
      redo();
      break;
    default:
      break;
    }
  }, [redo, undo]);

  const handleKeyDownEvent = useCallback((event: KeyboardEvent) => {
    if (!isCreateLevelOpen && !isDataOpen && !isSizeOpen && !preventKeyDownEvent) {
      const { code } = event;

      handleKeyDown(code);
    }
  }, [handleKeyDown, isCreateLevelOpen, isDataOpen, isSizeOpen, preventKeyDownEvent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [handleKeyDownEvent]);

  function historyPush(level: Level) {
    if (level.data !== history.current[history.current.length - 1].data) {
      historyIndex.current++;
      history.current = history.current.slice(0, historyIndex.current);
      history.current.push(level);
    }
  }

  function onClick(index: number, rightClick: boolean) {
    setIsDirty(true);
    setLevel(prevLevel => {
      if (!prevLevel) {
        return prevLevel;
      }

      // there always has to be a start position
      if (prevLevel.data.charAt(index) === LevelUtil.Start) {
        return prevLevel;
      }

      // there always has to be an end position
      if (prevLevel.data.charAt(index) === LevelUtil.End &&
        (prevLevel.data.match(new RegExp(LevelUtil.End, 'g')) || []).length === 1) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      let clear = rightClick;

      if (levelDataType === prevLevel.data.charAt(index)) {
        clear = true;
      }

      const newLevelDataType = clear ? LevelUtil.Default : levelDataType;

      // when changing start position the old position needs to be removed
      if (newLevelDataType === LevelUtil.Start) {
        const startIndex = level.data.indexOf(LevelUtil.Start);

        level.data = level.data.substring(0, startIndex) + LevelUtil.Default + level.data.substring(startIndex + 1);
      }

      level.data = level.data.substring(0, index) + newLevelDataType + level.data.substring(index + 1);

      historyPush(level);

      return level;
    });
  }

  function save() {
    toast.dismiss();
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
        toast.dismiss();
        toast.success('Saved');
      } else {
        throw res.text();
      }
    }).catch(err => {
      console.error(err);
      toast.dismiss();
      toast.error('Error fetching level');
    });
  }

  const listBlockChoices = [];
  const size = 40;

  // loop through the enum TileType
  for (const levelDataTypeKey in TileType) {
    let txt = undefined;

    if (levelDataTypeKey === TileType.End) {
      txt = level.leastMoves;
    } else if (levelDataTypeKey === TileType.Start) {
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
          handleClick={() => setLevelDataType(levelDataTypeKey as TileType)}
          leastMoves={0}
          levelDataType={levelDataTypeKey as TileType}
          noBoxShadow={true}
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
      <BasicLayout
        controls={[
          new Control('btn-undo', () => undo(), <>Undo</>, historyIndex.current === 0),
          new Control('btn-redo', () => redo(), <>Redo</>, historyIndex.current === history.current.length - 1),
          new Control('btn-size', () => setIsSizeOpen(true), <>Size</>),
          new Control('btn-data', () => setIsDataOpen(true), <>Data</>),
          new Control('btn-modify', () => setIsModifyOpen(true), <>Modify</>),
          new Control('btn-save', () => {
            if (id) {
              save();
            } else {
              setIsCreateLevelOpen(true);
            }
          }, <>Save</>),
          ...(!id ? [] : [
            new Control('btn-test', () => router.push(`/test/${id}`), <>Test</>, isDirty),
            new Control('btn-publish', () => setIsPublishLevelOpen(true), <>Publish</>, isDirty || level.leastMoves === 0),
          ]),
        ]}
        level={level}
        onClick={onClick}
      />
    </div>
    <SizeModal
      closeModal={() => setIsSizeOpen(false)}
      historyPush={historyPush}
      isOpen={isSizeOpen}
      level={level}
      setIsDirty={() => setIsDirty(true)}
      setLevel={setLevel}
    />
    <DataModal
      closeModal={() => setIsDataOpen(false)}
      historyPush={historyPush}
      isOpen={isDataOpen}
      level={level}
      setIsDirty={() => setIsDirty(true)}
      setLevel={setLevel}
    />
    <ModifyModal
      closeModal={() => setIsModifyOpen(false)}
      historyPush={historyPush}
      isOpen={isModifyOpen}
      setIsDirty={() => setIsDirty(true)}
      setLevel={setLevel}
    />
    <CreateLevelModal
      closeModal={() => {
        setIsCreateLevelOpen(false);
        setIsDirty(false);
      }}
      isOpen={isCreateLevelOpen}
      level={level}
    />
    <PublishLevelModal
      closeModal={() => setIsPublishLevelOpen(false)}
      isOpen={isPublishLevelOpen}
      level={level}
    />
  </>);
}
