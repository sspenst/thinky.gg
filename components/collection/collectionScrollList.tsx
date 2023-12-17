import Dimensions from '@root/constants/dimensions';
import { CollectionType } from '@root/models/constants/collection';
import Collection, { EnrichedCollection } from '@root/models/db/collection';
import { EnrichedLevel } from '@root/models/db/level';
import SelectOptionStats from '@root/models/selectOptionStats';
import classNames from 'classnames';
import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import SelectCard from '../cards/selectCard';
import LoadingSpinner from '../page/loadingSpinner';

interface Props {
  collection: EnrichedCollection | Collection;
  id: string;
  isHidden: boolean;
  onLoading: (loading: boolean) => void;
  setCollection: Dispatch<SetStateAction<EnrichedCollection | Collection | null>>;
  targetLevel: EnrichedLevel;
}

export default function CollectionScrollList({ collection, id, isHidden, onLoading, setCollection, targetLevel }: Props) {
  const isAutoScrolling = useRef(true); // scroll on init
  const [isLoading, setIsLoading] = useState<string>();
  const [noMoreAbove, setNoMoreAbove] = useState(collection.type === CollectionType.InMemory);
  const [noMoreBelow, setNoMoreBelow] = useState(collection.type === CollectionType.InMemory);

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
  }, [isHidden, targetLevel._id]);

  const fetchLevels = useCallback(async (cursor: string, direction: 'before' | 'after') => {
    const params = new URLSearchParams({
      populateLevelCursor: cursor,
      populateLevelDirection: direction,
    });

    const res = await fetch(`/api/collection-by-id/${collection._id.toString()}?${params}`);
    const newCollection = await res.json() as EnrichedCollection;

    return newCollection.levels;
  }, [collection._id]);

  const updateList = useCallback(async (direction: 'before' | 'after') => {
    if (isLoading || (direction === 'before' && noMoreAbove) || (direction === 'after' && noMoreBelow)) {
      return;
    }

    setIsLoading(direction);

    const cursor = direction === 'after' ? collection.levels[collection.levels.length - 1]._id.toString() : collection.levels[0]._id.toString();
    const newLevels = await fetchLevels(cursor, direction);

    if (direction === 'after') {
      // a max of 6 levels is expected to be returned
      if (newLevels.length < 6) {
        setNoMoreBelow(true);
      }

      // append new levels at the end
      setCollection(prevCollection => {
        const newCollection = JSON.parse(JSON.stringify(prevCollection)) as EnrichedCollection;

        newCollection.levels = [...newCollection.levels, ...newLevels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        });

        return newCollection;
      });
    } else {
      // a max of 6 levels is expected to be returned
      if (newLevels.length < 6) {
        setNoMoreAbove(true);
      }

      // prepend new levels at the start
      setCollection(prevCollection => {
        const newCollection = JSON.parse(JSON.stringify(prevCollection)) as EnrichedCollection;

        newCollection.levels = [...newLevels, ...collection.levels].filter((level, index, self) => {
          return index === self.findIndex((t) => (
            t._id.toString() === level._id.toString()
          ));
        });

        return newCollection;
      });
    }

    setIsLoading(undefined);
  }, [collection.levels, fetchLevels, isLoading, noMoreAbove, noMoreBelow, setCollection]);

  useEffect(() => {
    if (collection.levels.length === 0) {
      return;
    }

    if (targetLevel._id.toString() === collection.levels[0]._id.toString()) {
      onLoading(true);
      updateList('before').then(() => onLoading(false));

      return;
    }

    if (targetLevel._id.toString() === collection.levels[collection.levels.length - 1]._id.toString()) {
      onLoading(true);
      updateList('after').then(() => onLoading(false));

      return;
    }

  // NB: this useEffect should only be called on level change to see if the levels need to be updated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLevel._id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onScroll = useCallback(async (e: any) => {
    // wait for auto-scroll to complete so we don't trigger the 'before' level fetch
    if (isAutoScrolling.current) {
      return;
    }

    if (isLoading) {
      return;
    }

    // check if scroll was triggered by the user
    const { scrollHeight, clientHeight } = e.target;
    const scrollPosition = e.target.scrollTop;
    const thresh = 300;
    const reachedTop = scrollPosition <= thresh || targetLevel._id.toString() === collection.levels[0]._id.toString();
    const reachedBottom = scrollPosition + clientHeight >= scrollHeight - thresh || targetLevel._id.toString() === collection.levels[collection.levels.length - 1]._id.toString();
    const direction = reachedTop ? 'before' : reachedBottom ? 'after' : undefined;

    if (direction) {
      setIsLoading(direction);
      updateList(direction).then(() => setIsLoading(undefined));
    }
  }, [collection.levels, isLoading, targetLevel._id, updateList]);

  if (!collection.levels.length) {
    return (
      <div className='m-4'>
        No levels found.
      </div>
    );
  }

  return (
    <div className='overflow-y-auto max-w-full' onScroll={e => onScroll(e)}>
      {isLoading === 'before' &&
        <div className='justify-center items-center pt-3'>
          <LoadingSpinner />
        </div>
      }
      {!isLoading && !isAutoScrolling.current && !noMoreAbove &&
        <div className='flex flex-col justify-center items-center pt-3'>
          <button
            className='text-sm bg-gray-600 p-1 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75'
            onClick={() => updateList('before')}
          >
            Load more
          </button>
        </div>
      }
      {collection.levels.map((levelInCollection) => {
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
              stats: new SelectOptionStats(levelInCollection.leastMoves, (levelInCollection as EnrichedLevel)?.userMoves),
              text: levelInCollection.name,
              width: 216,
            }} />
          </div>
        );
      })}
      {!isLoading && !isAutoScrolling.current && !noMoreBelow &&
        <div className='flex flex-col justify-center items-center pb-3'>
          <button
            className='text-sm bg-gray-600 p-1 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75'
            onClick={() => updateList('after')}
          >
            Load more
          </button>
        </div>
      }
      {isLoading === 'after' &&
        <div className='justify-center items-center pb-3'>
          <LoadingSpinner />
        </div>
      }
    </div>
  );
}
