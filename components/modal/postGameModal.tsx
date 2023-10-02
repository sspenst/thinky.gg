import DidYouKnowTip from '@root/components/page/didYouKnowTip';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import {
  EmailIcon,
  EmailShareButton,
  FacebookIcon,
  FacebookMessengerIcon,
  FacebookShareButton,
  HatenaIcon,
  InstapaperIcon,
  LineIcon,
  LinkedinIcon,
  LivejournalIcon,
  MailruIcon,
  OKIcon,
  PinterestIcon,
  PocketIcon,
  RedditIcon,
  RedditShareButton,
  TelegramIcon,
  TelegramShareButton,
  TumblrIcon,
  TwitterIcon,
  TwitterShareButton,
  ViberIcon,
  VKIcon,
  WeiboIcon,
  WhatsappIcon,
  WorkplaceIcon
} from 'react-share';
import Card from '../cards/card';
import ChapterSelectCard from '../cards/chapterSelectCard';
import { getDifficultyFromValue } from '../formatted/formattedDifficulty';
import FormattedLevelReviews from '../formatted/formattedLevelReviews';
import RecommendedLevel from '../homepage/recommendedLevel';
import LoadingSpinner from '../page/loadingSpinner';
import ShareBar from '../social/shareBar';
import Modal from '.';

interface PostGameModalProps {
  chapter?: string;
  closeModal: () => void;
  collection?: Collection;
  isOpen: boolean;
  level: Level;
  reqUser: User | null;
}

export default function PostGameModal({ chapter, closeModal, collection, isOpen, level, reqUser }: PostGameModalProps) {
  let nextLevel: EnrichedLevel | undefined = undefined;
  let lastLevelInCollection = false;
  const [dontShowModalAgain, setDontShowModalAgain] = useState(false);

  useEffect(() => {
    if (dontShowModalAgain) {
      localStorage.setItem('dontShowPostGameModal', 'true');
      // expire 24h from now
      localStorage.setItem('dontShowPostGameModalExpire', (new Date(Date.now() + 24 * 60 * 60 * 1000)).toISOString());
    }
  }, [dontShowModalAgain]);
  useEffect(() => {
    const storedPref = localStorage.getItem('dontShowPostGameModal');
    const storedPrefExpire = localStorage.getItem('dontShowPostGameModalExpire');

    // check if expired...
    if (storedPrefExpire && new Date(storedPrefExpire) < new Date()) {
      localStorage.removeItem('dontShowPostGameModal');
      localStorage.removeItem('dontShowPostGameModalExpire');

      return;
    }

    if (storedPref === 'true') {
      closeModal();
    }
  }, [closeModal]);

  if (collection && collection.levels) {
    const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

    if (levelIndex + 1 < collection.levels.length) {
      nextLevel = collection.levels[levelIndex + 1] as EnrichedLevel;
    } else {
      lastLevelInCollection = true;
    }
  }

  const { data, isLoading } = useHomePageData([HomepageDataType.RecommendedLevel], !isOpen || nextLevel !== undefined);

  const recommendedLevel = data && data[HomepageDataType.RecommendedLevel];
  const [queryParams, setQueryParams] = useState({});

  // NB: this useEffect only runs when entering the level page
  // (moving between levels within a collection does not remount this component)
  // this is ok for now because query params are currently never expected
  // to change when going between two level pages
  useEffect(() => {
    setQueryParams(new URLSearchParams(window.location.search));
  }, []);

  const hrefOverride = nextLevel ? `/level/${nextLevel.slug}?${queryParams}` : undefined;
  const url = `https://pathology.gg/level/${level.slug}`;

  const quote = 'Just completed Pathology.gg puzzle "' + level.name + '" (Difficulty: ' + getDifficultyFromValue(level.calc_difficulty_estimate).name + ')';

  return (
    <Modal
      closeModal={closeModal}
      isOpen={isOpen}
      title={
        <div className='flex flex-col gap-1'>
          <h3 className='text-center text-2xl p-1'>
            Congratulations!
          </h3>
          <h4 className='text-md'>
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
            {chapter && !isNaN(Number(chapter)) ?
              <Card id='campaign' title='Head back to the campaign!'>
                <div className='p-3'>
                  <ChapterSelectCard chapter={Number(chapter)} />
                </div>
              </Card>
              :
              (isLoading ? <LoadingSpinner /> : <RecommendedLevel
                hrefOverride={hrefOverride}
                id='next-level'
                level={nextLevel ?? recommendedLevel}
                onClick={closeModal}
                title={nextLevel ? 'Next Level' : 'Try this next!'}
              />)
            }
          </>
        }
        <div className='flex items-center gap-1'>
          <input
            type='checkbox'
            checked={dontShowModalAgain}
            onChange={(e) => setDontShowModalAgain(e.target.checked)}
          />
          <label>Don&apos;t show this popup for 24h</label>
        </div>
        <DidYouKnowTip reqUser={reqUser} />
      </div>
    </Modal>
  );
}
