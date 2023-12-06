import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import TileType from '../../constants/tileType';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import Level from '../../models/db/level';
import BasicLayout from '../level/basicLayout';
import CreateLevelModal from '../modal/createLevelModal';
import DataModal from '../modal/dataModal';
import EditLevelModal from '../modal/editLevelModal';
import ModifyModal from '../modal/modifyModal';
import PublishLevelModal from '../modal/publishLevelModal';
import SizeModal from '../modal/sizeModal';

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
  const [isEditLevelModalOpen, setIsEditLevelOpen] = useState(false);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const { preventKeyDownEvent } = useContext(PageContext);
  const router = useRouter();
  const [tileType, setTileType] = useState<TileType>(TileType.Default);
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
      setTileType(TileType.Default);
      break;
    case 'Digit1':
      setTileType(TileType.Wall);
      break;
    case 'Digit2':
      setTileType(TileType.Block);
      break;
    case 'Digit3':
      setTileType(TileType.End);
      break;
    case 'Digit4':
      setTileType(TileType.Start);
      break;
    case 'Digit5':
      setTileType(TileType.Hole);
      break;
    case 'Digit6':
      setTileType(TileType.Left);
      break;
    case 'Digit7':
      setTileType(TileType.Up);
      break;
    case 'Digit8':
      setTileType(TileType.Right);
      break;
    case 'Digit9':
      setTileType(TileType.Down);
      break;
    case 'KeyA':
      setTileType(TileType.UpLeft);
      break;
    case 'KeyB':
      setTileType(TileType.UpRight);
      break;
    case 'KeyC':
      setTileType(TileType.DownRight);
      break;
    case 'KeyD':
      setTileType(TileType.DownLeft);
      break;
    case 'KeyE':
      setTileType(TileType.NotLeft);
      break;
    case 'KeyF':
      setTileType(TileType.NotUp);
      break;
    case 'KeyG':
      setTileType(TileType.NotRight);
      break;
    case 'KeyH':
      setTileType(TileType.NotDown);
      break;
    case 'KeyI':
      setTileType(TileType.LeftRight);
      break;
    case 'KeyJ':
      setTileType(TileType.UpDown);
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
    if (!isCreateLevelOpen && !isDataOpen && !isEditLevelModalOpen && !isModifyOpen && !isPublishLevelOpen && !isSizeOpen && !preventKeyDownEvent) {
      const { code } = event;

      handleKeyDown(code);
    }
  }, [handleKeyDown, isCreateLevelOpen, isDataOpen, isEditLevelModalOpen, isModifyOpen, isPublishLevelOpen, isSizeOpen, preventKeyDownEvent]);

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
      if (prevLevel.data.charAt(index) === TileType.Start) {
        return prevLevel;
      }

      // there always has to be an end position
      if (prevLevel.data.charAt(index) === TileType.End &&
        (prevLevel.data.match(new RegExp(TileType.End, 'g')) || []).length === 1) {
        return prevLevel;
      }

      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      let clear = rightClick;

      if (tileType === prevLevel.data.charAt(index)) {
        clear = true;
      }

      const newTileType = clear ? TileType.Default : tileType;

      // when changing start position the old position needs to be removed
      if (newTileType === TileType.Start) {
        const startIndex = level.data.indexOf(TileType.Start);

        level.data = level.data.substring(0, startIndex) + TileType.Default + level.data.substring(startIndex + 1);
      }

      level.data = level.data.substring(0, index) + newTileType + level.data.substring(index + 1);

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

  const allTiles = '0123456789\nABCDEFGHIJ';

  return (<>
    <div className='flex flex-col h-full'>
      <div className='flex flex-col h-24 py-1'>
        <BasicLayout
          cellClassName={(index) => {
            if (allTiles[index] !== tileType) {
              return 'opacity-50 hover:opacity-100 transition cursor-pointer';
            } else {
              return 'editor-selected';
            }
          }}
          id='editor-selection'
          level={{
            data: allTiles,
            height: 2,
            leastMoves: 0,
            width: 10,
          } as Level}
          onClick={(index) => setTileType(allTiles[index] as TileType)}
        />
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
            new Control('btn-edit', () => setIsEditLevelOpen(true), <>Edit</>, isDirty),
            new Control('btn-test', () => router.push(`/test/${id}`), <>Test</>, isDirty),
            new Control('btn-publish', () => setIsPublishLevelOpen(true), <>Publish</>, isDirty || level.leastMoves === 0),
          ]),
        ]}
        id={level._id?.toString() ?? 'new'}
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
    <EditLevelModal
      closeModal={() => setIsEditLevelOpen(false)}
      isOpen={isEditLevelModalOpen}
      level={level}
    />
    <PublishLevelModal
      closeModal={() => setIsPublishLevelOpen(false)}
      isOpen={isPublishLevelOpen}
      level={level}
    />
  </>);
}
