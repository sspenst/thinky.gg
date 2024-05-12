import Dimensions from '@root/constants/dimensions';
import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import getLevelCompleteColor from '@root/helpers/getLevelCompleteColor';
import { CollectionType } from '@root/models/constants/collection';
import classNames from 'classnames';
import Link from 'next/link';
import React, { Dispatch, SetStateAction, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Collection, { EnrichedCollection } from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import CollectionScrollList from '../collection/collectionScrollList';
import FormattedUser from '../formatted/formattedUser';
import Modal from '../modal';
import LevelInfoModal from '../modal/levelInfoModal';
import PostGameModal from '../modal/postGameModal';
import { dropConfetti } from '../page/confetti';
import Game from './game';
import FormattedLevelInfo from './info/formattedLevelInfo';
import Solved from './info/solved';

interface GameWrapperProps {
  chapter?: string;
  collection: EnrichedCollection | Collection | null;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  onStatsSuccess?: () => void;
  setCollection: Dispatch<SetStateAction<EnrichedCollection | Collection | null>>;
  user: User | null;
}

export default function GameWrapper({ chapter, collection, level, onNext, onPrev, onStatsSuccess, setCollection, user }: GameWrapperProps) {
  const [dontShowPostGameModal, setDontShowPostGameModal] = useState(false);
  const isCollectionLoading = useRef(false);
  const [isCollectionViewHidden, setIsCollectionViewHidden] = useState(false);
  const { isDynamic, isDynamicSupported, toggleVersion } = useContext(MusicContext);
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
  const [mutePostGameModalForThisLevel, setMutePostGameModalForThisLevel] = useState(false);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const [showCollectionViewModal, setShowCollectionViewModal] = useState(false);

  useEffect(() => {
    const storedCollectionViewHidden = localStorage.getItem('isCollectionViewHidden');

    // only need to set this if we are altering the default state
    if (storedCollectionViewHidden === 'true') {
      setIsCollectionViewHidden(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isCollectionViewHidden', isCollectionViewHidden ? 'true' : 'false');
  }, [isCollectionViewHidden]);

  useEffect(() => {
    const storedPref = localStorage.getItem('dontShowPostGameModal');
    const storedPrefExpire = localStorage.getItem('dontShowPostGameModalExpire');

    if (storedPrefExpire && new Date(storedPrefExpire) < new Date()) {
      localStorage.removeItem('dontShowPostGameModal');
      localStorage.removeItem('dontShowPostGameModalExpire');

      return;
    }

    if (storedPref === 'true') {
      setDontShowPostGameModal(true);
    }

    setMutePostGameModalForThisLevel(false);
    setShowCollectionViewModal(false);
  }, [level._id]);

  function scrollModalToCollectionLevel() {
    setTimeout(() => {
      const anchorId = `collection-level-modal-${level._id.toString()}`;
      const anchor = document.getElementById(anchorId);

      if (anchor) {
        anchor.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    // delay 300ms to allow the collection list to render in the modal view
    }, 300);
  }

  function getCollectionTitle() {
    if (!collection) {
      return null;
    }

    let href = chapter ? `/chapter${chapter}` : `/collection/${collection.slug}`;

    if (collection.type === CollectionType.InMemory) {
      href = collection.slug;
    }

    return (
      <Link className='text-xl font-bold hover:underline overflow-hidden break-words' href={href}>
        {collection.name}
      </Link>
    );
  }

  const getCollectionLevelList = useCallback((id: string) => {
    if (!collection) {
      return null;
    }

    return (
      <CollectionScrollList
        collection={collection}
        id={id}
        isHidden={isCollectionViewHidden}
        onLoading={(loading) => {
          isCollectionLoading.current = loading;
        }}
        setCollection={setCollection}
        targetLevel={level}
      />
    );
  }, [collection, isCollectionViewHidden, level, setCollection]);

  return (
    <div className='flex h-full'>
      <div className='flex flex-col grow max-w-full'>
        <div className='flex items-center justify-center py-1 px-2 gap-1 xl:hidden'>
          {collection && <>
            <button className='mr-1' onClick={() => {
              setShowCollectionViewModal(true);
              setPreventKeyDownEvent(true);
              scrollModalToCollectionLevel();
            }} >
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
              </svg>
            </button>
            <Modal
              isOpen={showCollectionViewModal}
              closeModal={() => {
                setShowCollectionViewModal(false);
                setPreventKeyDownEvent(false);
              }}
              title={getCollectionTitle()}
            >
              <div className='flex justify-center' >
                <div className='flex flex-col w-fit items-center'>
                  {getCollectionLevelList('modal')}
                </div>
              </div>
            </Modal>
          </>}
          <button
            className='flex gap-2 items-center truncate'
            onClick={() => {
              setIsLevelInfoOpen(true);
              setPreventKeyDownEvent(true);
            }}
            style={{
              color: getLevelCompleteColor(level) ?? 'var(--color)',
            }}
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' width='16' height='16' style={{
              minWidth: 16,
              minHeight: 16,
            }}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12' />
            </svg>
            <h1
              className='whitespace-nowrap font-bold underline truncate'
            >
              {level.name}
            </h1>
            {level.userMoves === level.leastMoves && <Solved className='-ml-2' />}
          </button>
          <span>by</span>
          <div style={{ minWidth: 100 }}>
            <FormattedUser id='level-title' size={Dimensions.AvatarSizeSmall} user={level.userId} />
          </div>
          <LevelInfoModal
            closeModal={() => {
              setIsLevelInfoOpen(false);
              setPreventKeyDownEvent(false);
            }}
            isOpen={isLevelInfoOpen}
            level={level}
          />
        </div>
        <Game
          disablePlayAttempts={!user}
          disableStats={!user}
          enableSessionCheckpoint={true}
          key={`game-${level._id.toString()}`}
          level={level}
          onNext={collection ? () => {
            if (isCollectionLoading.current) {
              return;
            }

            onNext();
          } : undefined}
          onPrev={collection ? () => {
            if (isCollectionLoading.current) {
              return;
            }

            onPrev();
          } : undefined}
          onSolve={() => {
            dropConfetti();

            if (isDynamicSupported && isDynamic) {
              toggleVersion('hot');
            }

            if (!dontShowPostGameModal && !mutePostGameModalForThisLevel) {
              setTimeout(() => {
                setShowPostGameModalOpen(true);
                setMutePostGameModalForThisLevel(true);
                setPreventKeyDownEvent(true);
              }, 500);
            }
          }}
          onStatsSuccess={onStatsSuccess}
        />
      </div>
      {collection &&
        <div className={classNames(
          'hidden flex-col items-center border-l border-color-3 w-60',
          // NB: we want to keep this component in the DOM when it is hidden by the user
          // this allows updating the collection level list on level change to continue running behind the scenes
          { 'xl:flex': !isCollectionViewHidden },
        )}>
          <div className='flex justify-between w-full gap-2 items-center px-4 py-3 border-b border-color-3'>
            {getCollectionTitle()}
            <button onClick={() => setIsCollectionViewHidden(true)}>
              <svg className='w-5 h-5 hover:opacity-100 opacity-50' fill='currentColor' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg' style={{ minWidth: 20, minHeight: 20 }}>
                <path fillRule='evenodd' d='M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8Zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z' />
              </svg>
            </button>
          </div>
          {getCollectionLevelList('sidebar')}
        </div>
      }
      <div className='hidden xl:flex flex-col border-l border-color-3 break-words z-10 h-full w-100'>
        {collection && isCollectionViewHidden &&
          <button
            className='flex items-center gap-4 w-full border-b border-color-3 hover-bg-3 transition px-4 py-3'
            onClick={() => {
              if (setIsCollectionViewHidden) {
                setIsCollectionViewHidden(false);
              }
            }}
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6' style={{ minWidth: 24, minHeight: 24 }}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
            </svg>
            <span className='font-bold text-left whitespace-pre-wrap truncate'>{collection.name}</span>
          </button>
        }
        <div className='px-4 py-3 overflow-y-auto h-full'>
          <FormattedLevelInfo level={level} />
        </div>
      </div>
      <PostGameModal
        chapter={chapter}
        closeModal={() => {
          setShowPostGameModalOpen(false);
          setPreventKeyDownEvent(false);
        }}
        collection={collection}
        dontShowPostGameModal={dontShowPostGameModal}
        isOpen={postGameModalOpen}
        level={level}
        reqUser={user}
        setDontShowPostGameModal={setDontShowPostGameModal}
      />
    </div>
  );
}
