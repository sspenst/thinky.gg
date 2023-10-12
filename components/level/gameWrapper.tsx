import { MusicContext } from '@root/contexts/musicContext';
import { PageContext } from '@root/contexts/pageContext';
import React, { useContext, useEffect, useState } from 'react';
import Collection from '../../models/db/collection';
import { EnrichedLevel } from '../../models/db/level';
import User from '../../models/db/user';
import PostGameModal from '../modal/postGameModal';
import Game from './game';

interface GameWrapperProps {
  chapter?: string;
  collection: Collection | undefined;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({ chapter, collection, level, onNext, onPrev, user }: GameWrapperProps) {
  const { dynamicMusic, toggleVersion } = useContext(MusicContext);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);

  useEffect(() => {
    if (dynamicMusic) {
      toggleVersion('cold');
    }
  // reset to cold when arriving on a new level
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level._id]);

  return (
    <>
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
          if (dynamicMusic) {
            toggleVersion('hot');
          }

          setTimeout(() => {
            setShowPostGameModalOpen(true);
            setPreventKeyDownEvent(true);
          }, 200);
        }}
      />
      <PostGameModal
        chapter={chapter}
        closeModal={() => {
          setShowPostGameModalOpen(false);
          setPreventKeyDownEvent(false);
        }}
        collection={collection}
        isOpen={postGameModalOpen}
        level={level}
        reqUser={user}
      />
    </>
  );
}
