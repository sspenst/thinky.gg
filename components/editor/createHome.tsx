import Link from 'next/link';
import React from 'react';
import TimeRange from '../../constants/timeRange';
import { CreatePageProps } from '../../pages/[subdomain]/create';
import LevelCard from '../cards/levelCard';

/* istanbul ignore next */
export default function CreateHome({ levels, user }: CreatePageProps) {
  return (
    <div className='flex flex-col gap-5 m-5 items-center'>
      <div className='text-center'>
        Welcome to the Create page! Here you can create new levels and make changes to your draft levels. Once you have finished creating your level, click &apos;Test&apos; to set the level&apos;s least steps, then click &apos;Publish&apos; to make your level available for everyone to play. You can unpublish or archive a level at any time.
      </div>
      <div className='flex flex-row flex-wrap justify-center gap-4'>
        <Link
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer block'
          href='/new'
        >
          New Level
        </Link>
        <Link
          className='py-2 px-4 rounded-lg hover:bg-neutral-500'
          href={{
            pathname: '/search',
            query: {
              searchAuthor: user.name,
              sortBy: 'ts',
              timeRange: TimeRange[TimeRange.All],
            },
          }}
        >
          Your Published Levels
        </Link>
        <Link
          className='py-2 px-4 rounded-lg hover:bg-neutral-500'
          href={`/profile/${user.name}/collections`}
        >
          Your Collections
        </Link>
      </div>
      <div className='flex flex-wrap justify-center gap-4'>
        {levels.map(level => {
          return (
            <LevelCard
              href={`/edit/${level._id.toString()}`}
              id='draft-level'
              key={`draft-level-${level._id.toString()}`}
              level={level}
            />
          );
        })}
      </div>
    </div>
  );
}
