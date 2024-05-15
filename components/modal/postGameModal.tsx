import isGuest from '@root/helpers/isGuest';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import LevelCardWithTitle from '../cards/levelCardWithTitle';
import FormattedLevelReviews from '../level/reviews/formattedLevelReviews';
import Modal from '.';

interface PostGameModalProps {
  chapter?: string;
  closeModal: () => void;
  collection?: Collection | null;
  dontShowPostGameModal: boolean;
  isOpen: boolean;
  level: Level;
  reqUser: User | null;
  setDontShowPostGameModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function PostGameModal({ chapter, closeModal, collection, dontShowPostGameModal, isOpen, level, reqUser, setDontShowPostGameModal }: PostGameModalProps) {
  let nextLevel: EnrichedLevel | undefined = undefined;
  let lastLevelInCollection = false;

  if (collection && collection.levels) {
    const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

    if (levelIndex + 1 < collection.levels.length) {
      nextLevel = collection.levels[levelIndex + 1] as EnrichedLevel;
    } else {
      lastLevelInCollection = true;
    }
  }

  const { data } = useHomePageData([HomepageDataType.RecommendedLevel], !isOpen || nextLevel !== undefined);

  const [queryParams, setQueryParams] = useState<URLSearchParams>();
  const [recommendedLevel, setRecommendedLevel] = useState<EnrichedLevel>();

  useEffect(() => {
    const newRecommendedLevel = data && data[HomepageDataType.RecommendedLevel];

    if (newRecommendedLevel) {
      setRecommendedLevel(newRecommendedLevel);
    }
  }, [data]);

  // NB: this useEffect only runs when entering the level page
  // (moving between levels within a collection does not remount this component)
  // this is ok for now because query params are currently never expected
  // to change when going between two level pages
  useEffect(() => {
    setQueryParams(new URLSearchParams(window.location.search));
  }, []);

  function nextActionCard() {
    if (nextLevel) {
      return (
        <LevelCardWithTitle
          href={`/level/${nextLevel.slug}${queryParams?.toString().length ?? 0 !== 0 ? `?${queryParams}` : ''}`}
          id='next-level'
          level={nextLevel}
          onClick={closeModal}
          title='Next Level'
        />
      );
    }

    if (chapter && !isNaN(Number(chapter))) {
      return (
        <Card id='campaign' title='Head back to the campaign!'>
          <ChapterSelectCard chapter={Number(chapter)} />
        </Card>
      );
    }

    return (
      <LevelCardWithTitle
        id='next-level'
        level={recommendedLevel}
        onClick={closeModal}
        title='Try this next!'
      />
    );
  }

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={
        <div
          className='fadeIn'
          style={{
            animationDelay: '0.2s',
          }}
        >
          Congratulations!
        </div>
      }
    >
      <div
        className='flex flex-col gap-4 justify-center items-center fadeIn'
        style={{
          animationDelay: '0.6s',
        }}
      >
        {!reqUser ?
          <div className='text-center'>
            <Link href='/signup' className='underline font-bold'>Sign up</Link> (or use a <Link href='/play-as-guest' className='underline font-bold'>Guest Account</Link>) to save your progress and get access to more features.
          </div>
          :
          <>
            {lastLevelInCollection && collection &&
              <div>
                {level.name} is the last level in <Link className='font-bold hover:underline' href={`/collection/${collection.slug}`}>{collection.name}</Link>.
              </div>
            }
            {nextActionCard()}
            {isGuest(reqUser) ?
              <div className='text-center text-sm'>
                <div className='flex flex-col gap-2'>
                  <span className='text-2xl italic font-semibold'>By the way...</span><span className='text-xs'>You are playing as a <span className='font-bold italic'>guest</span> and missing out on a ton of features. <Link href='/settings' className='hover:underline font-bold text-blue-300'>Convert to a regular account</Link> (it&apos;s free and only takes a few seconds!)</span>
                </div>
              </div>
              :
              <details>
                <summary onClick={(e: React.MouseEvent) => {
                  // make this element invisible
                  (e.target as HTMLElement).style.display = 'none';
                }} className='text-xs cursor-pointer italic py-1'>Share your thoughts on {level.name}</summary>
                <FormattedLevelReviews hideReviews={true} inModal={true} />
              </details>
            }
          </>
        }
        <div className='flex gap-2'>
          <input
            id='dont-show-post-game-modal'
            type='checkbox'
            checked={dontShowPostGameModal}
            onChange={(e) => {
              setDontShowPostGameModal(e.target.checked);

              if (e.target.checked) {
                localStorage.setItem('dontShowPostGameModal', 'true');
                // expire 24h from now
                localStorage.setItem('dontShowPostGameModalExpire', (new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString());
              } else {
                localStorage.removeItem('dontShowPostGameModal');
                localStorage.removeItem('dontShowPostGameModalExpire');
              }
            }}
          />
          <label className='text-xs' htmlFor='dont-show-post-game-modal'>Mute this popup for 24h</label>
        </div>
      </div>
    </Modal>
  );
}
