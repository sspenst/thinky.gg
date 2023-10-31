import Dimensions from '@root/constants/dimensions';
import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import useDeviceCheck, { ScreenSize } from '@root/hooks/useDeviceCheck';
import { CollectionType } from '@root/models/constants/collection';
import SelectOptionStats from '@root/models/selectOptionStats';
import classNames from 'classnames';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
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
  collection: Collection | undefined;
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
  const { screenSize } = useDeviceCheck();
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
  }, [level._id]);

  useEffect(() => {
    setMutePostGameModalForThisLevel(false);
  }, [level._id]);

  useEffect(() => {
    if (!collection) {
      return;
    }

    // scroll the collection list to the current level
    setTimeout(() => {
      const anchorId = level._id.toString() + '-collection-list';
      const anchor = document.getElementById(anchorId);

      if (anchor) {
        anchor.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }, showCollectionViewModal ? 300 : 0); // delay 300ms to allow the collection list to render in the modal view
  // NB: only want to scroll on page load or when the collection view modal is opened
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level._id, showCollectionViewModal]);

  const collectionLevelTitle = collection && (
    <Link className='text-xl font-bold hover:underline w-fit' href={'/collection/' + collection.slug}>
      {collection.name}
    </Link>
  );

  const collectionLevelList = collection && (<>
    {collection.levels.map((levelInCollection) => {
      const isCurrentLevel = level._id.toString() === levelInCollection._id.toString();
      const anchorId = levelInCollection._id.toString() + '-collection-list';

      return (
        <div className={classNames({ 'bg-3': isCurrentLevel })} id={anchorId} key={anchorId}>
          <SelectCard
            option={{
              author: levelInCollection.userId?.name,
              height: Dimensions.OptionHeightLarge,
              hideAddToPlayLaterButton: collection.type !== CollectionType.PlayLater,
              href: `/level/${levelInCollection.slug}?cid=${collection._id.toString()}`,
              id: levelInCollection._id.toString(),
              level: levelInCollection,
              text: levelInCollection.name,
              stats: new SelectOptionStats(levelInCollection.leastMoves, (levelInCollection as EnrichedLevel)?.userMoves),
            }}
          />
        </div>
      );
    })}
  </>);

  return (
    <div className='flex h-full'>
      <div className='flex flex-col grow max-w-full'>
        {screenSize && screenSize < ScreenSize.XL &&
          <div className='flex items-center justify-center py-1 px-2 gap-1'>
            {collection && <>
              <button className='mr-1' onClick={() => {
                setShowCollectionViewModal(true);
                setPreventKeyDownEvent(true);
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
                title={collectionLevelTitle}
              >
                {collectionLevelList}
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
              by
            <div style={{ minWidth: 100 }}>
              <FormattedUser id='level-title' size={Dimensions.AvatarSizeSmall} user={level.userId} />
            </div>
          </div>
        }
        <LevelInfoModal
          closeModal={() => {
            setIsLevelInfoOpen(false);
            setPreventKeyDownEvent(false);
          }}
          isOpen={isLevelInfoOpen}
          level={level}
        />
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
      {screenSize >= ScreenSize.XL && <>
        {collection && !collectionViewHidden &&
          <div className={classNames('flex flex-col items-center gap-2 overflow-y-auto px-4 py-3 border-l border-color-4', collectionViewHidden && 'hidden')}>
            <div className='flex justify-between w-56 gap-2 items-center'>
              {collectionLevelTitle}
              <button onClick={() => setCollectionViewHidden(!collectionViewHidden)}>
                <svg className='w-5 h-5 hover:opacity-100 opacity-50' fill='currentColor' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg' style={{ minWidth: 20, minHeight: 20 }}>
                  <path fillRule='evenodd' d='M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8Zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z' />
                </svg>
              </button>
            </div>
            {collectionLevelList}
          </div>
        }
        <div className='border-l border-color-4 break-words z-10 h-full w-100 overflow-y-auto'>
          {collection && collectionViewHidden &&
            <button
              className='flex items-center gap-4 w-full border-b border-color-4 hover-bg-3 transition px-4 py-3'
              onClick={() => {
                if (setCollectionViewHidden) {
                  setCollectionViewHidden(!collectionViewHidden);
                }
              }}
            >
              <svg className='w-5 h-5 hover:opacity-100 opacity-50' fill='currentColor' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg' style={{ minWidth: 20, minHeight: 20 }}>
                <path fillRule='evenodd' d='M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5ZM10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5Z' />
              </svg>
              <span className='text-left'>Show <span className='font-bold'>{collection.name}</span> collection</span>
            </button>
          }
          <div className='px-4 py-3'>
            <FormattedLevelInfo level={level} />
          </div>
        </div>
      </>}
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
