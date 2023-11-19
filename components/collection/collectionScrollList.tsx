import Dimensions from '@root/constants/dimensions';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { initCollection } from '@root/lib/initializeLocalDb';
import { CollectionType } from '@root/models/constants/collection';
import Collection, { EnrichedCollection } from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import SelectOptionStats from '@root/models/selectOptionStats';
import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import SelectCard from '../cards/selectCard';
import LoadingSpinner from '../page/loadingSpinner';

interface Props {
    collection: EnrichedCollection | Collection;
    id: string;
    isHidden: boolean;
    targetLevel: EnrichedLevel;
    }

export default function CollectionScrollList({ collection, isHidden, id, targetLevel }: Props) {
  const [cursor, setCursor] = useState<string>(targetLevel._id.toString());
  const [accumlatedLevels, setAccumulatedLevels] = useState<Level[]>(collection.levels);

  const [isLoading, setIsLoading] = useState(false);
  const fetchLevels = async (cursor: string) => {
    // Replace with your actual API call
    // Ensure the API supports fetching data in both directions based on the cursor
    return await fetch('/api/collection-by-id/' + collection._id.toString() + `?populateAroundLevel=${cursor}`);
  };

  /*  const { data: collection, isLoading } = useSWRHelper<EnrichedCollection>(`/api/collection-by-id/${initCollection._id.toString()}?populateAroundLevel=` + cursor.toString(), {}, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0

  });*/

  // scroll to the collection level on level change
  useEffect(() => {
    if (!collection || isHidden) {
      return;
    }

    const anchorId = `collection-level-sidebar-${targetLevel._id.toString()}`;
    const anchor = document.getElementById(anchorId);

    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, [collection, isHidden, targetLevel._id]);

  const onScroll = useCallback(async (e: any) => {
    const { scrollHeight, clientHeight } = e.target;

    const scrollPosition = e.target.scrollTop;

    const reachedTop = scrollPosition <= 100;
    const reachedBottom = scrollPosition + clientHeight >= scrollHeight - 100;

    if ((reachedBottom && !isLoading) || (reachedTop && !isLoading)) {
      setIsLoading(true);

      const newColsReq = await fetchLevels(cursor);
      const newColResp = await newColsReq.json();
      const newLevels = newColResp.levels;

      setIsLoading(false);

      if (reachedBottom) {
        // Append new levels at the end
        setAccumulatedLevels(prevLevels => [...prevLevels, ...newLevels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        }
        ));
        setCursor(newLevels[newLevels.length - 1]._id.toString());
      } else {
        // Prepend new levels at the start
        setAccumulatedLevels(prevLevels => [...newLevels, ...prevLevels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        }
        ));
        setCursor(newLevels[0]._id.toString());
      }
    }
  }, [cursor, fetchLevels, isLoading]);

  if (accumlatedLevels.length === 0) {
    return <div className='flex justify-center items-center h-full'><LoadingSpinner /></div>;
  }

  return (
    <div className='overflow-y-auto max-w-full' onScroll={(e: any) => {
      onScroll(e);
    }
    }>
      {accumlatedLevels?.map((levelInCollection) => {
        const isCurrentLevel = targetLevel._id.toString() === levelInCollection._id.toString();
        const anchorId = `collection-level-${id}-${levelInCollection._id.toString()}`;
        const href = '/level/' + levelInCollection.slug + (collection.type !== CollectionType.InMemory ? '?cid=' + collection._id.toString() : '');

        return (
          <div className={classNames({ 'bg-3': isCurrentLevel }, { 'rounded-xl': id === 'modal' })} id={anchorId} key={anchorId}>
            <SelectCard option={{
              author: levelInCollection.userId?.name,
              height: Dimensions.OptionHeightMedium,
              href: href,
              id: `${id}-${levelInCollection._id.toString()}`,
              level: levelInCollection,
              text: levelInCollection.name,
              stats: new SelectOptionStats(levelInCollection.leastMoves, (levelInCollection as EnrichedLevel)?.userMoves),
              width: 216,
            }} />
          </div>
        );
      })}
    </div>);
}
