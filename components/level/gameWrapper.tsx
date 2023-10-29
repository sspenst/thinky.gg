import { Dialog } from '@headlessui/react';
import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import useDeviceCheck, { ScreenSize } from '@root/hooks/useDeviceCheck';
import { CollectionType } from '@root/models/CollectionEnums';
import SelectOptionStats from '@root/models/selectOptionStats';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Collection from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import SelectCard from '../cards/selectCard';
import Modal from '../modal';
import PostGameModal from '../modal/postGameModal';
import Game from './game';
import Sidebar from './sidebar';

interface GameWrapperProps {
  chapter?: string;
  collection: Collection | undefined;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({ chapter, collection, level, onNext, onPrev, user }: GameWrapperProps) {
  const { isDynamic, isDynamicSupported, toggleVersion } = useContext(MusicContext);
  const [dontShowPostGameModal, setDontShowPostGameModal] = useState(false);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const [mutePostGameModalForThisLevel, setMutePostGameModalForThisLevel] =
    useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { screenSize } = useDeviceCheck();
  const [showCollectionViewModal, setShowCollectionViewModal] = useState(false);
  const [collectionViewHidden, setCollectionViewHidden] =
    useState<boolean>(false);

  useEffect(() => {
    const storedPref = localStorage.getItem('dontShowPostGameModal');
    const storedPrefExpire = localStorage.getItem(
      'dontShowPostGameModalExpire'
    );

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
    if (collection || showCollectionViewModal) {
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
      }, 300); // delay 300ms to allow the collection list to render in the modal view
    }
  }, [level._id, collection, showCollectionViewModal]);

  const collectionLevelList = collection && (<><h2 className='text-xl font-bold text-center hover:underline pt-3'>
    <Link href={'/collection/' + collection.slug}>
      {collection.name}
    </Link>
  </h2>
  <div
    id='collection-list'
    className={
      'flex flex-col overflow-y-scroll '

    }
    style={{
      direction: 'rtl', // makes the scrollbar appear on the left
    }}
  >

    {collection.levels.map((levelInCollection) => {
      let customStyle = {};

      if (level._id.toString() === levelInCollection._id.toString()) {
        customStyle = {
          border: '2px solid var(--color)',
          borderRadius: '4px',
          padding: '4px',
          margin: '4px',
          backgroundColor: 'var(--bg-color-2)',
          boxShadow: '0 0 0 2px var(--color)',
        };
      }

      const anchorId =
    levelInCollection._id.toString() + '-collection-list';

      return (
        <div key={anchorId} id={anchorId}>
          <SelectCard
            option={{
              id: levelInCollection._id.toString(),
              level: levelInCollection,
              text: levelInCollection.name,
              stats: new SelectOptionStats(levelInCollection.leastMoves, (levelInCollection as EnrichedLevel)?.userMoves),
              hideAddToPlayLaterButton: collection.type !== CollectionType.PlayLater,
              customStyle: customStyle,
              href:
            '/level/' +
            levelInCollection.slug +
            '?cid=' +
            collection._id.toString(),
            }}
          />
        </div>
      );
    })}
  </div></>);

  return (
    <div className='flex h-full'>
      { (screenSize < ScreenSize.MD) && collection && (
        <button className='absolute right-0 pt-1 pr-1' onClick={() => {
          setShowCollectionViewModal(true);
          setPreventKeyDownEvent(true);
        }} >
          <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='currentColor' className='bi bi-list-ol' viewBox='0 0 16 16'>
            <path fillRule='evenodd' d='M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z' />
            <path d='M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z' />
          </svg>
        </button>
      )}
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

      {screenSize >= ScreenSize.MD && collection?.levels && (
        <div className='flex flex-row'>
          <div className={'flex flex-col gap-2 ' + (collectionViewHidden ? 'hidden' : '')}>
            {collectionLevelList}
          </div>
          <div
            className='flex items-center justify-center h-full cursor-pointer'
            onClick={() => setCollectionViewHidden(!collectionViewHidden)}
          >
            {collectionViewHidden ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                fill='currentColor'
                className='bi bi-arrow-bar-left'
                viewBox='0 0 16 16'
              >
                <path
                  fillRule='evenodd'
                  d='M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5ZM10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5Z'
                />
              </svg>
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='16'
                height='16'
                fill='currentColor'
                className='bi bi-arrow-bar-right'
                viewBox='0 0 16 16'
              >
                <path
                  fillRule='evenodd'
                  d='M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8Zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z'
                />
              </svg>
            )}
          </div>
        </div>
      )}
      <Sidebar level={level} />
      <Modal isOpen={showCollectionViewModal} closeModal={() => {
        setShowCollectionViewModal(false);
        setPreventKeyDownEvent(false);
      }
      }>

        {collectionLevelList}

      </Modal>
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
