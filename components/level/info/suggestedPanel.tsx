import DidYouKnowTip from '@root/components/page/didYouKnowTip';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Collection from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import Card from '../../cards/card';
import ChapterSelectCard from '../../cards/chapterSelectCard';
import RecommendedLevel from '../../homepage/recommendedLevel';

interface SuggestedPanelProps {
  chapter?: string;
  collection?: Collection;
  level: Level;
  reqUser: User | undefined | null;
}

export default function SuggestedPanel({ chapter, collection, level, reqUser }: SuggestedPanelProps) {
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

  const { data } = useHomePageData([HomepageDataType.RecommendedLevel], nextLevel !== undefined);
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

  return (<>
    <div className='flex flex-col gap-1'>
      <h3 className='text-center text-2xl p-1'>
        Congratulations!
      </h3>
      <h4 className='text-md'>
        You completed {level.name}!
      </h4>
    </div>
    <div className='flex flex-col gap-4 justify-center items-center'>
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
          {chapter && !isNaN(Number(chapter)) ?
            <Card id='campaign' title='Head back to the campaign!'>
              <div className='p-3'>
                <ChapterSelectCard chapter={Number(chapter)} />
              </div>
            </Card>
            :
            <RecommendedLevel
              hrefOverride={hrefOverride}
              id='next-level'
              level={nextLevel ?? recommendedLevel}
              title={nextLevel ? 'Next Level' : 'Try this next!'}
            />
          }
        </>
      }
      <DidYouKnowTip reqUser={reqUser} />
    </div>
  </>);
}
