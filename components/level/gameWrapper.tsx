import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import React, { useContext, useEffect, useState } from 'react';
import Collection from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import PostGameModal from '../modal/postGameModal';
import Game from './game';
import Sidebar from './sidebar';
import { LevelContext } from '@root/contexts/levelContext';
import SelectOption from '@root/models/selectOption';
import SelectCard from '../cards/selectCard';
import useDeviceCheck, { ScreenSize } from '@root/hooks/useDeviceCheck';
import Link from 'next/link';

interface GameWrapperProps {
  chapter?: string;
  collection: Collection | undefined;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({
  chapter,
  collection,
  level,
  onNext,
  onPrev,
  user,
}: GameWrapperProps) {
  const { dynamicMusic, isMusicSupported, toggleVersion } =
    useContext(MusicContext);
  const [dontShowPostGameModal, setDontShowPostGameModal] = useState(false);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const [mutePostGameModalForThisLevel, setMutePostGameModalForThisLevel] =
    useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { screenSize } = useDeviceCheck();
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
    if (collection) {
      // scroll the collection list to the current level
      const anchorId = level._id.toString() + '-collection-list';
      const anchor = document.getElementById(anchorId);

      if (anchor) {
        anchor.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }
  }, [level._id, collection]);
  return (
    <div className="flex h-full">
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
          if (isMusicSupported && dynamicMusic) {
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
        <div className="flex flex-row">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-center hover:underline pt-3">
              <Link href={'/collection/' + collection.slug}>
                {collection.name}
              </Link>
            </h2>
            <div
              id="collection-list"
              className={
                'flex flex-col overflow-y-scroll ' +
                (collectionViewHidden ? 'hidden' : '')
              }
              style={{
                direction: 'rtl', // makes the scrollbar appear on the left
              }}
            >
              {collection.levels.map((levelInCollection, i) => {
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
                        hideAddToPlayLaterButton: true,
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
            </div>
          </div>
          <div
            className="flex items-center justify-center h-full cursor-pointer"
            onClick={() => setCollectionViewHidden(!collectionViewHidden)}
          >
            {collectionViewHidden ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-arrow-bar-left"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5ZM10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5Z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-arrow-bar-right"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M6 8a.5.5 0 0 0 .5.5h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L12.293 7.5H6.5A.5.5 0 0 0 6 8Zm-2.5 7a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z"
                />
              </svg>
            )}
          </div>
        </div>
      )}
      <Sidebar level={level} />
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
