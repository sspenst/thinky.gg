import Dimensions from '@root/constants/dimensions';
import { AppContext } from '@root/contexts/appContext';
import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import { ScreenSize } from '@root/hooks/useDeviceCheck';
import { CollectionType } from '@root/models/constants/collection';
import SelectOptionStats from '@root/models/selectOptionStats';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import Collection from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import SelectCard from '../cards/selectCard';
import FormattedUser from '../formatted/formattedUser';
import Modal from '../modal';
import LevelInfoModal from '../modal/levelInfoModal';
import PostGameModal from '../modal/postGameModal';
import Game from './game';
import FormattedLevelInfo from './info/formattedLevelInfo';
import Solved from './info/solved';

interface GameWrapperProps {
  chapter?: string;
  collection: Collection | null;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({ chapter, collection, level, onNext, onPrev, user }: GameWrapperProps) {
  const [collectionViewHidden, setCollectionViewHidden] = useState(false);
  const [dontShowPostGameModal, setDontShowPostGameModal] = useState(false);
  const { isDynamic, isDynamicSupported, toggleVersion } = useContext(MusicContext);
  const [isLevelInfoOpen, setIsLevelInfoOpen] = useState(false);
  const [mutePostGameModalForThisLevel, setMutePostGameModalForThisLevel] = useState(false);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { deviceInfo } = useContext(AppContext);
  const [showCollectionViewModal, setShowCollectionViewModal] = useState(false);

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

  // scroll to the collection level on level change
  useEffect(() => {
    if (!collection) {
      return;
    }

    const anchorId = `collection-level-sidebar-${level._id.toString()}`;
    const anchor = document.getElementById(anchorId);

    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [collection, level._id]);

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
    }, deviceInfo.screenSize < ScreenSize.MD ? 300 : 0);
  }

  function getCollectionTitle() {
    if (!collection) {
      return null;
    }

    const href = chapter ? `/chapter${chapter}` : `/collection/${collection.slug}`;

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

    return (<>
      {collection.levels.map((levelInCollection) => {
        const isCurrentLevel = level._id.toString() === levelInCollection._id.toString();
        const anchorId = `collection-level-${id}-${levelInCollection._id.toString()}`;
        const href = '/level/' + levelInCollection.slug + (collection.type !== CollectionType.InMemory ? '?cid=' + collection._id.toString() : '');

        return (
          <div className={classNames({ 'bg-3': isCurrentLevel }, { 'rounded-xl': id === 'modal' })} id={anchorId} key={anchorId}>
            <SelectCard option={{
              author: levelInCollection.userId?.name,
              hideDifficulty: true,
              hideStats: false,
              href: href,
              id: levelInCollection._id.toString(),
              level: levelInCollection,
              text: levelInCollection.name,
              stats: new SelectOptionStats(levelInCollection.leastMoves, (levelInCollection as EnrichedLevel)?.userMoves),
              width: 216,
            }} />
          </div>
        );
      })}
    </>);
  }, [collection, level._id]);

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
              <div className='flex justify-center'>
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
              color: level.userMoves ? (level.userMoves === level.leastMoves ? 'var(--color-complete)' : 'var(--color-incomplete)') : 'var(--color)',
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
          allowFreeUndo={true}
          disablePlayAttempts={!user}
          disableStats={!user}
          enableSessionCheckpoint={true}
          key={`game-${level._id.toString()}`}
          level={level}
          onNext={collection ? onNext : undefined}
          onPrev={collection ? onPrev : undefined}

          onSolve={() => {
            if (isDynamicSupported && isDynamic) {
              toggleVersion('hot');
            }

            if (!dontShowPostGameModal && !mutePostGameModalForThisLevel) {
              setTimeout(() => {
                setShowPostGameModalOpen(true);
                setMutePostGameModalForThisLevel(true);
                setPreventKeyDownEvent(true);
              }, 200);
            }
          }}

        />
      </div>
      {collection && !collectionViewHidden &&
        <div className='hidden xl:flex flex-col items-center border-l border-color-4 w-60'>
          <div className='flex justify-between w-full gap-2 items-center px-4 py-3 border-b border-color-4'>
            {getCollectionTitle()}
            <button onClick={() => setCollectionViewHidden(!collectionViewHidden)}>
              <svg className='w-5 h-5 hover:opacity-100 opacity-50' fill='currentColor' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg' style={{ minWidth: 20, minHeight: 20 }}>
                <path fillRule='evenodd' d='M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8Zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z' />
              </svg>
            </button>
          </div>
          <div className='overflow-y-auto max-w-full'>
            {getCollectionLevelList('sidebar')}
          </div>
        </div>
      }
      <div className='hidden xl:block border-l border-color-4 break-words z-10 h-full w-100 overflow-y-auto'>
        {collection && collectionViewHidden &&
          <button
            className='flex items-center gap-4 w-full border-b border-color-4 hover-bg-3 transition px-4 py-3'
            onClick={() => {
              if (setCollectionViewHidden) {
                setCollectionViewHidden(!collectionViewHidden);
              }
            }}
          >
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-6 h-6' style={{ minWidth: 24, minHeight: 24 }}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' />
            </svg>
            <span className='font-bold text-left whitespace-pre-wrap truncate'>{collection.name}</span>
          </button>
        }
        <div className='px-4 py-3'>
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
