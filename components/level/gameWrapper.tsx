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

interface GameWrapperProps {
  chapter?: string;
  collection: Collection | undefined;
  level: EnrichedLevel;
  onNext: () => void;
  onPrev: () => void;
  user: User | null;
}

export default function GameWrapper({ chapter, collection, level, onNext, onPrev, user }: GameWrapperProps) {
  const { dynamicMusic, isMusicSupported, toggleVersion } = useContext(MusicContext);
  const [dontShowPostGameModal, setDontShowPostGameModal] = useState(false);
  const [postGameModalOpen, setShowPostGameModalOpen] = useState(false);
  const [mutePostGameModalForThisLevel, setMutePostGameModalForThisLevel] = useState(false);
  const { setPreventKeyDownEvent } = useContext(PageContext);
  const { screenSize} = useDeviceCheck( )
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

  return (
    <div className='flex h-full'>
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
        <div className='flex flex-col overflow-y-scroll'>
        {
        collection.levels.map((levelInCollection, i) => {

          let customStyle = {};
          if (level._id.toString() === levelInCollection._id.toString()) {
            customStyle = {
              border: '2px solid var(--color)',
              borderRadius: '4px',
              padding: '4px',
              margin: '4px',
              backgroundColor: 'var(--bg-color-2)',
              boxShadow: '0 0 0 2px var(--color)',
            }
          }
          const anchorId = levelInCollection._id.toString()+'-collection-list-'+i;
          return <div key={anchorId}
           id={anchorId}
           >
            <SelectCard 
            
            option={{
              id: levelInCollection._id.toString(),
              level: levelInCollection,
              text: levelInCollection.name,
              hideAddToPlayLaterButton: true,
              customStyle: customStyle,
              href: "/level/"+levelInCollection.slug+"?cid="+collection._id.toString()+"#"+anchorId,

            }
            }
            />
            </div>
        })
        }
        </div>
      )
      }
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
