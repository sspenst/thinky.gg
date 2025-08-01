import { ValidateLevelResponse } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import isPro from '@root/helpers/isPro';
import TileTypeHelper from '@root/helpers/tileTypeHelper';
import { ChevronDown, LucideCode, LucideFlipHorizontal2, LucidePencil, LucidePlay, LucideRepeat2, LucideSave, LucideShare } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import TileType from '../../constants/tileType';
import { PageContext } from '../../contexts/pageContext';
import Control from '../../models/control';
import Level from '../../models/db/level';
import { ICON_REDO, ICON_RESIZE, ICON_UNDO } from '../icons/gameIcons';
import BasicLayout from '../level/basicLayout';
import CreateLevelModal from '../modal/createLevelModal';
import DataModal from '../modal/dataModal';
import EditLevelModal from '../modal/editLevelModal';
import ModifyModal from '../modal/modifyModal';
import PublishLevelModal from '../modal/publishLevelModal';
import SchedulePublishModal from '../modal/schedulePublishModal';
import SizeModal from '../modal/sizeModal';
import StyledTooltip from '../page/styledTooltip';

interface EditorProps {
  isDirty: boolean;
  level: Level;
  setIsDirty: (isDirty: boolean) => void;
  setLevel: React.Dispatch<React.SetStateAction<Level>>;
}

export default function Editor({ isDirty, level, setIsDirty, setLevel }: EditorProps) {
  const { game, deviceInfo, user } = useContext(AppContext);
  const history = useRef<Level[]>([level]);
  const historyIndex = useRef<number>(0);
  const [isCreateLevelOpen, setIsCreateLevelOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [isEditLevelModalOpen, setIsEditLevelOpen] = useState(false);
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [isPublishLevelOpen, setIsPublishLevelOpen] = useState(false);
  const [isSchedulePublishOpen, setIsSchedulePublishOpen] = useState(false);
  const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const { preventKeyDownEvent } = useContext(PageContext);
  const router = useRouter();
  const [tileType, setTileType] = useState<TileType>(TileType.Default);
  const [validateLevelResponse, setValidateLevelResponse] = useState<ValidateLevelResponse>();
  const { id } = router.query;
  const publishDropdownRef = useRef<HTMLDivElement>(null);

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
    case 'Digit0': {
      setTileType(TileType.Default);
      break;
    }

    case 'Digit1': {
      setTileType(TileType.Wall);
      break;
    }

    case 'Digit2': {
      setTileType(TileType.Block);
      break;
    }

    case 'Digit3': {
      setTileType(TileType.Exit);
      break;
    }

    case 'Digit4': {
      setTileType(TileType.Player);
      break;
    }

    case 'Digit5': {
      setTileType(TileType.Hole);
      break;
    }

    case 'Digit6': {
      setTileType(TileType.Left);
      break;
    }

    case 'Digit7': {
      setTileType(TileType.Up);
      break;
    }

    case 'Digit8': {
      setTileType(TileType.Right);
      break;
    }

    case 'Digit9': {
      setTileType(TileType.Down);
      break;
    }

    case 'KeyA': {
      setTileType(TileType.UpLeft);
      break;
    }

    case 'KeyB': {
      setTileType(TileType.UpRight);
      break;
    }

    case 'KeyC': {
      setTileType(TileType.DownRight);
      break;
    }

    case 'KeyD': {
      setTileType(TileType.DownLeft);
      break;
    }

    case 'KeyE': {
      setTileType(TileType.NotLeft);
      break;
    }

    case 'KeyF': {
      setTileType(TileType.NotUp);
      break;
    }

    case 'KeyG': {
      setTileType(TileType.NotRight);
      break;
    }

    case 'KeyH': {
      setTileType(TileType.NotDown);
      break;
    }

    case 'KeyI': {
      setTileType(TileType.LeftRight);
      break;
    }

    case 'KeyJ': {
      setTileType(TileType.UpDown);
      break;
    }

    case 'KeyZ': {
      undo();
      break;
    }

    case 'KeyY': {
      redo();
      break;
    }

    case 'KeyR': {
      redo();
      break;
    }

    default:
      break;
    }
  }, [redo, undo]);

  const handleKeyDownEvent = useCallback((event: KeyboardEvent) => {
    if (!isCreateLevelOpen && !isDataOpen && !isEditLevelModalOpen && !isModifyOpen && !isPublishLevelOpen && !isSchedulePublishOpen && !isSizeOpen && !preventKeyDownEvent) {
      const { code } = event;

      handleKeyDown(code);
    }
  }, [handleKeyDown, isCreateLevelOpen, isDataOpen, isEditLevelModalOpen, isModifyOpen, isPublishLevelOpen, isSchedulePublishOpen, isSizeOpen, preventKeyDownEvent]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDownEvent);

    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, [handleKeyDownEvent]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (publishDropdownRef.current && !publishDropdownRef.current.contains(event.target as Node)) {
        setIsPublishDropdownOpen(false);
      }
    }

    if (isPublishDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPublishDropdownOpen]);

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

      const prevTileType = prevLevel.data.charAt(index) as TileType;
      const level = JSON.parse(JSON.stringify(prevLevel)) as Level;
      let clear = rightClick;

      if (tileType === prevTileType) {
        clear = true;
      }

      // handle all cases related to the player
      if (prevTileType === TileType.Player || prevTileType === TileType.PlayerOnExit) {
        // disallow all changes except for exit when it is allowed
        if (tileType !== TileType.Exit || !game.allowMovableOnExit) {
          return prevLevel;
        }

        const newTileType = clear ? TileType.Player : TileTypeHelper.getExitSibilingTileType(prevTileType);

        level.data = level.data.substring(0, index) + newTileType + level.data.substring(index + 1);

        historyPush(level);

        return level;
      }

      function getNewTileType() {
        if (game.allowMovableOnExit) {
          // place movable on exit or replace movable on exit
          if ((prevTileType === TileType.Exit || TileTypeHelper.isOnExit(prevTileType)) && TileTypeHelper.getExitSibilingTileType(tileType) !== undefined) {
            const exitSiblingTileType = TileTypeHelper.getExitSibilingTileType(tileType);

            if (prevTileType === exitSiblingTileType) {
              return TileType.Exit;
            } else {
              return exitSiblingTileType;
            }
            // place exit on movable or remove exit from movable
          } else if (TileTypeHelper.getExitSibilingTileType(prevTileType) !== undefined && tileType === TileType.Exit) {
            return TileTypeHelper.getExitSibilingTileType(prevTileType);
          }
        }

        return tileType;
      }

      const newTileType = clear ? TileType.Default : getNewTileType();

      // when changing start position the old position needs to be removed
      if (newTileType === TileType.Player || newTileType === TileType.PlayerOnExit) {
        const playerIndex = level.data.indexOf(TileType.Player);

        if (playerIndex !== -1) {
          level.data = level.data.substring(0, playerIndex) + TileType.Default + level.data.substring(playerIndex + 1);
        }

        const playerOnExitIndex = level.data.indexOf(TileType.PlayerOnExit);

        if (playerOnExitIndex !== -1) {
          level.data = level.data.substring(0, playerOnExitIndex) + TileType.Exit + level.data.substring(playerOnExitIndex + 1);
        }
      }

      const newData = level.data.substring(0, index) + newTileType + level.data.substring(index + 1);

      level.data = newData;

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

  function getEditorSelectionLevel() {
    return {
      data: '0123456789\nABCDEFGHIJ',
      height: 2,
      leastMoves: 0,
      width: 10,
    } as Level;
  }

  const editorSelectionLevel = getEditorSelectionLevel();

  useEffect(() => {
    setValidateLevelResponse(game.validateLevel ? game.validateLevel(level.data) : undefined);
  }, [game, level.data]);

  const isValid = !validateLevelResponse || validateLevelResponse.valid;
  const btnTestTooltip = !isValid ?
    validateLevelResponse.reasons.join('\n') : isDirty ? 'Save before testing' : null;

  const isMobile = deviceInfo.isMobile;

  const undoTxt = isMobile ? ICON_UNDO : <div className='flex gap-1'>{ICON_UNDO}<span>Undo</span> </div>;

  const redoTxt = isMobile ? ICON_REDO : <div className='flex gap-1'>{ICON_REDO}<span>Redo</span> </div>;

  const resizeTxt = isMobile ? ICON_RESIZE : <div className='flex gap-1'>{ICON_RESIZE}<span>Resize</span> </div>;

  const modifyTxt = isMobile ? <LucideFlipHorizontal2 /> : <div className='flex gap-1'><LucideFlipHorizontal2 /><span>Modify</span></div>;

  const modifyCode = isMobile ? <LucideCode /> : <div className='flex gap-1'><LucideRepeat2 /><span>Data</span></div>;

  const modifySave = isMobile ? <LucideSave /> : <div className='flex gap-1'><LucideSave /><span>Save</span></div>;

  const modifyEdit = isMobile ? <LucidePencil /> : <div className='flex gap-1'><LucidePencil /><span>Edit</span></div>;
  const modifyPlay = isMobile ? <LucidePlay /> : <div className='flex gap-1'><LucidePlay /><span>Play</span></div>;

  return (<>
    <div className='flex flex-col h-full'>
      <div className='flex flex-col h-24 py-1' style={{
        height: editorSelectionLevel.height * 48,
      }}>
        <BasicLayout
          cellClassName={(index) => {
            if (editorSelectionLevel.data[index] !== tileType) {
              return 'hover:scale-110 transition cursor-pointer';
            } else {
              return 'editor-selected';
            }
          }}
          id='editor-selection'
          level={editorSelectionLevel}
          onClick={(index) => setTileType(editorSelectionLevel.data[index] as TileType)}
        />
      </div>
      <BasicLayout
        controls={[
          new Control('btn-undo', () => undo(), undoTxt, historyIndex.current === 0),
          new Control('btn-redo', () => redo(), redoTxt, historyIndex.current === history.current.length - 1),
          new Control('btn-size', () => setIsSizeOpen(true), resizeTxt),
          new Control('btn-data', () => setIsDataOpen(true), modifyCode),
          new Control('btn-modify', () => setIsModifyOpen(true), modifyTxt),
          new Control('btn-save', () => {
            if (id) {
              save();
            } else {
              setIsCreateLevelOpen(true);
            }
          }, modifySave),
          ...(!id ? [] : [
            new Control('btn-edit', () => setIsEditLevelOpen(true), modifyEdit, isDirty),
            new Control(
              'btn-test',
              () => router.push(`/test/${id}`),
              <div className='flex flex-row'>
                <div data-tooltip-id='btn-test-tooltip' data-tooltip-content={btnTestTooltip}>
                  {!isValid && '⚠️ '}
                </div>
                {modifyPlay}
                <StyledTooltip id='btn-test-tooltip' />
              </div>,
              isDirty || !isValid,
            ),
            new Control(
              'btn-publish-main',
              () => setIsPublishLevelOpen(true),
              <div className='flex items-center gap-1 w-full'>
                <div className='flex items-center gap-1 flex-1' data-tooltip-id='btn-publish-tooltip' data-tooltip-content={isDirty ? 'Save and test before publishing' : level.leastMoves === 0 ? 'Test before publishing' : null}>
                  <LucideShare stroke={isDirty ? 'white' : 'lightgreen'} />
                  {!isMobile && <div>Publish</div>}
                </div>
                {isPro(user) && (
                  <div className='relative' ref={publishDropdownRef}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPublishDropdownOpen(!isPublishDropdownOpen);
                      }}
                      className='flex items-center p-1 hover:bg-purple-600/20 hover:border-purple-500/50 border border-transparent rounded transition-all duration-200 cursor-pointer'
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsPublishDropdownOpen(!isPublishDropdownOpen);
                        }
                      }}
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isPublishDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isPublishDropdownOpen && (
                      <div className='absolute right-0 bottom-full mb-2 w-56 bg-gradient-to-br from-gray-900 to-gray-800 border border-purple-500/30 rounded-lg shadow-2xl z-50 backdrop-blur-sm'>
                        <div className='py-2'>
                          <div
                            onClick={() => {
                              if (isDirty || level.leastMoves === 0) return;
                              setIsSchedulePublishOpen(true);
                              setIsPublishDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-all duration-200 flex items-center gap-3 group ${
                              isDirty || level.leastMoves === 0
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-blue-600/20 cursor-pointer'
                            }`}
                            title={isDirty ? 'Save and test before scheduling publish' : level.leastMoves === 0 ? 'Test before scheduling publish' : undefined}
                            role='button'
                            tabIndex={isDirty || level.leastMoves === 0 ? -1 : 0}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && !(isDirty || level.leastMoves === 0)) {
                                e.preventDefault();
                                setIsSchedulePublishOpen(true);
                                setIsPublishDropdownOpen(false);
                              }
                            }}
                          >
                            <div className='flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg group-hover:scale-110 transition-transform duration-200'>
                              <svg width='16' height='16' viewBox='0 0 24 24' fill='white' className='drop-shadow-sm'>
                                <path d='M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.89-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z' />
                              </svg>
                            </div>
                            <div className='flex-1'>
                              <div className='flex items-center gap-2'>
                                <span className='font-medium text-white group-hover:text-purple-200 transition-colors'>Schedule Publish</span>
                                <Image alt='pro' src='/pro.svg' width={16} height={16} className='opacity-90' />
                              </div>
                              <div className='text-xs text-gray-400 group-hover:text-gray-300 transition-colors'>Publish at optimal times</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <StyledTooltip id='btn-publish-tooltip' />
              </div>,
              isDirty || level.leastMoves === 0,
            ),
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
    <SchedulePublishModal
      closeModal={() => setIsSchedulePublishOpen(false)}
      isOpen={isSchedulePublishOpen}
      level={level}
    />
  </>);
}
