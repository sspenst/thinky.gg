import Dimensions from '@root/constants/dimensions';
import useSWRHelper from '@root/hooks/useSWRHelper';
import { initCollection } from '@root/lib/initializeLocalDb';
import { CollectionType } from '@root/models/constants/collection';
import Collection, { EnrichedCollection } from '@root/models/db/collection';
import Level, { EnrichedLevel } from '@root/models/db/level';
import SelectOptionStats from '@root/models/selectOptionStats';
import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import SelectCard from '../cards/selectCard';
import LoadingSpinner from '../page/loadingSpinner';

interface Props {
    collection: EnrichedCollection | Collection;
    onLevelsChange: (levels: Level[]) => void;
    id: string;
    isHidden: boolean;
    targetLevel: EnrichedLevel;
    }

export default function CollectionScrollList({ collection, onLevelsChange, isHidden, id, targetLevel }: Props) {
  const [accumlatedLevels, setAccumulatedLevels] = useState<Level[]>(collection.levels);
  const [noMoreAbove, setNoMoreAbove] = useState(false);
  const [noMoreBelow, setNoMoreBelow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isAutoScrolling = useRef(true); // we scroll on init...
  const fetchLevels = useCallback(async (cursor: string, direction: string) => {
    // Replace with your actual API call
    // Ensure the API supports fetching data in both directions based on the cursor

    return await fetch('/api/collection-by-id/' + collection._id.toString() + `?populateCursor=${cursor}&populateDirection=${direction}`);
  }, [collection._id]);

  useEffect(() => {
    onLevelsChange(accumlatedLevels);
  }, [accumlatedLevels, onLevelsChange]);
  // scroll to the collection level on level change
  useEffect(() => {
    if (isHidden) {
      return;
    }

    isAutoScrolling.current = true;

    const anchorId = `collection-level-sidebar-${targetLevel._id.toString()}`;
    const anchor = document.getElementById(anchorId);

    if (anchor) {
      anchor.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 500);
    }
  }, [ isHidden, targetLevel._id]);

  const updateList = useCallback(async (reachedBottom: boolean, reachedTop: boolean) => {
    if ((reachedBottom && !isLoading) || (reachedTop && !isLoading)) {
      const direction = reachedBottom ? 'after' : 'before';
      const newCursor = reachedBottom ? accumlatedLevels[accumlatedLevels.length - 1]._id.toString() : accumlatedLevels[0]._id.toString();

      if (direction === 'before' && noMoreAbove
        ||
        noMoreBelow && direction === 'after'

      ) {
        return;
      }

      setIsLoading(true);
      const newColsReq = await fetchLevels(newCursor, direction);

      setIsLoading(false);
      const newColResp: EnrichedCollection = await newColsReq.json();

      const newLevels = newColResp.levels;

      if (newLevels.length === 0) {
        return;
      }

      if (reachedBottom) {
        if (accumlatedLevels[accumlatedLevels.length - 1]._id.toString() === newLevels[newLevels.length - 1]._id.toString()) {
          setNoMoreBelow(true);

          return;
        }

        // Append new levels at the end
        setAccumulatedLevels(prevLevels => [...prevLevels, ...newLevels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        } ));
      } else {
        // if the first level is already in the list, we have reached the top
        if (accumlatedLevels[0]._id.toString() === newLevels[0]._id.toString()) {
          setNoMoreAbove(true);

          return;
        }

        // Prepend new levels at the start
        setAccumulatedLevels(prevLevels => [...newLevels, ...prevLevels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        } ));
      }
    }
  }, [accumlatedLevels, fetchLevels, isLoading, noMoreAbove, noMoreBelow, onLevelsChange]);

  useEffect(() => {
    if (collection.type === CollectionType.InMemory) {
      return;
    }

    if (targetLevel._id.toString() === accumlatedLevels[0]._id.toString()) {
      updateList(false, true);
    }

    if (targetLevel._id.toString() === accumlatedLevels[accumlatedLevels.length - 1]._id.toString()) {
      updateList(true, false);
    }
  }, [accumlatedLevels, collection.type, targetLevel._id, updateList]);

  const onScroll = useCallback(async (e: any) => {
    if (collection.type === CollectionType.InMemory) {
      return;
    }

    if (isAutoScrolling.current) {
      return;
    }

    // check if scroll was triggered by the user
    const { scrollHeight, clientHeight } = e.target;

    const scrollPosition = e.target.scrollTop;
    const thresh = 300;
    const reachedTop = scrollPosition <= thresh || targetLevel._id.toString() === accumlatedLevels[0]._id.toString();
    const reachedBottom = scrollPosition + clientHeight >= scrollHeight - thresh || targetLevel._id.toString() === accumlatedLevels[accumlatedLevels.length - 1]._id.toString();

    updateList(reachedBottom, reachedTop);
  }, [accumlatedLevels, collection.type, targetLevel._id, updateList]);

  if (accumlatedLevels?.length === 0) {
    return <div className='flex justify-center items-center h-full'><LoadingSpinner /></div>;
  }

  return (
    <div className='overflow-y-auto max-w-full' onScroll={(e: any) => {
      onScroll(e);
    }
    }>
      {isLoading && <div className='justify-center items-center pt-3'><LoadingSpinner /></div>}
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
      {isLoading && <div className='justify-center items-center pb-3'><LoadingSpinner /></div>}
    </div>);
}
