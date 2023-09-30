import DidYouKnowTip from '@root/components/page/didYouKnowTip';
import { LevelContext } from '@root/contexts/levelContext';
import useHomePageData, { HomepageDataType } from '@root/hooks/useHomePageData';
import Level, { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import Card from '../../cards/card';
import ChapterSelectCard from '../../cards/chapterSelectCard';
import RecommendedLevel from '../../homepage/recommendedLevel';

interface SuggestedPanelProps {
  level: Level;
  reqUser: User | undefined | null;
}

export default function SuggestedPanel({ level, reqUser }: SuggestedPanelProps) {
  const levelContext = useContext(LevelContext);

  const collection = levelContext?.collection;
  const chapter = levelContext?.chapter;
  let nextLevel: EnrichedLevel | undefined = undefined;
  let lastLevelInCollection = false;

  console.log(collection);

  if (collection && collection.levels) {
    const levelIndex = collection.levels.findIndex((l) => l._id === level._id);

    console.log(levelIndex, collection.levels.length);

    if (levelIndex + 1 < collection.levels.length) {
      nextLevel = collection.levels[levelIndex + 1] as EnrichedLevel;
    } else {
      lastLevelInCollection = true;
    }
  }

  // TODO: don't use SWR here, or at least don't refetch every time you switch to the panel
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
    <div className='flex flex-col gap-4'>
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
          {chapter !== undefined && lastLevelInCollection ?
            <Card id='campaign' title='Head back to the campaign!'>
              <div className='p-3'>
                <ChapterSelectCard chapter={chapter} />
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
