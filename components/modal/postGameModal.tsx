import DidYouKnowTip from '@root/components/page/didYouKnowTip';
import { GameType } from '@root/constants/Games';
import { AppContext } from '@root/contexts/appContext';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import LevelCardWithTitle from '../cards/levelCardWithTitle';
import { getDifficultyFromEstimate } from '../formatted/formattedDifficulty';
import FormattedLevelReviews from '../level/reviews/formattedLevelReviews';
import ShareBar from '../social/shareBar';
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
  const { game } = useContext(AppContext);

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

  const url = `${game.baseUrl}/level/${level.slug}`;
  const difficultyEstimate = game.type === GameType.COMPLETE_AND_SHORTEST ? level.calc_difficulty_completion_estimate : level.calc_difficulty_estimate;
  const quote = 'Just completed ' + game.displayName + ' puzzle "' + level.name + '" (Difficulty: ' + getDifficultyFromEstimate(difficultyEstimate).name + ')';

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
        <div className='flex flex-col gap-1'>
          <h3 className='text-center text-2xl p-1'>
            Congratulations!
          </h3>
          <h4>
            You completed {level.name}!
          </h4>
          <ShareBar url={url} quote={quote} />
        </div>
      }
    >
      <div className='flex flex-col gap-2 justify-center items-center'>
        {!reqUser ?
          <div className='text-center'>
            <Link href='/signup' className='underline font-bold'>Sign up</Link> (or use a <Link href='/play-as-guest' className='underline font-bold'>Guest Account</Link>) to save your progress and get access to more features.
          </div>
          :
          <>
            <FormattedLevelReviews hideReviews={true} inModal={true} />
            {lastLevelInCollection && collection &&
              <div>
                {level.name} is the last level in <Link className='font-bold hover:underline' href={`/collection/${collection.slug}`}>{collection.name}</Link>.
              </div>
            }
            {nextActionCard()}
          </>
        }
        <div className='flex items-center gap-1'>
          <input
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
          <label>Don&apos;t show this popup for 24h</label>
        </div>
        <DidYouKnowTip reqUser={reqUser} />
      </div>
    </Modal>
  );
}
