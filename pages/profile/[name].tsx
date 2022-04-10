import { LevelModel, UserModel } from '../../models/mongoose';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import Link from 'next/link';
import Pack from '../../models/db/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import useStats from '../../hooks/useStats';

interface ProfileParams extends ParsedUrlQuery {
  name: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { name } = context.params as ProfileParams;
  const user = await UserModel.findOne<User>({ isOfficial: false, name: name }, '-password');

  let levels: Level[] = [];

  if (user) {
    levels = await LevelModel.find<Level>(
      { '$or': [ { 'userId': user._id }, { 'originalUserId': user._id } ] },
      '_id name packId'
    ).populate<{packId: Pack}>('packId', '_id name userId')
      .populate<{userId: User}>('userId', '_id isOfficial name');

    levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
  }

  const packs: Pack[] = [...new Set(levels.map(level => level.packId as unknown as Pack))];

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const creators: User[] = [...new Set(levels.map(level => level.userId as unknown as User))];

  creators.sort((a: User, b: User) => {
    if (a.isOfficial === b.isOfficial) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    }

    return a.isOfficial ? -1 : 1;
  });

  return {
    props: {
      creators: JSON.parse(JSON.stringify(creators)),
      levels: JSON.parse(JSON.stringify(levels)),
      packs: JSON.parse(JSON.stringify(packs)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
  };
}

interface ProfileProps {
  creators: User[];
  levels: Level[];
  packs: Pack[];
  user: User | undefined;
}

export default function Profile({ creators, levels, packs, user }: ProfileProps) {
  const { stats } = useStats();

  if (!user) {
    return <span>User not found!</span>;
  }

  const formattedCreators = [];

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];

    formattedCreators.push(
      <div key={`creator-${i}`}>
        {
          creator.isOfficial ? 
          <>
            {`${user.name}'s `}
            <Link href={`/creator/${creator._id}`} passHref>
              <button className='font-bold underline'>
                {creator.name}
              </button>
            </Link>
            {' levels:'}
          </>
          :
          <Link href={`/creator/${user._id}`} passHref>
            <button className='font-bold underline'>
              {`${user.name}'s levels:`}
            </button>
          </Link>
        }
      </div>
    );

    const formattedPacks = [];
  
    for (let j = 0; j < packs.length; j++) {
      const pack = packs[j];

      if (pack.userId !== creator._id) {
        continue;
      }

      const formattedLevels = [];
  
      for (let k = 0; k < levels.length; k++) {
        const level = levels[k];
  
        if (level.packId._id !== pack._id) {
          continue;
        }

        const stat = stats?.find(stat => stat.levelId === level._id);
    
        formattedLevels.push(
          <li key={`${j}-${k}`} style={{marginLeft: 20}}>
            <Link href={`/level/${level._id}`} passHref>
              <button
                className='font-bold underline'
                style={{
                  color: stat ? stat.complete ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
                }}
              >
                {level.name}
              </button>
            </Link>
          </li>
        );
      }
  
      formattedPacks.push(
        <li key={j}>
          <Link href={`/pack/${pack._id}`} passHref>
            <button className='font-bold underline'>
              {pack.name}
            </button>
          </Link>
          <ul>
            {formattedLevels}
          </ul>
        </li>
      );
    }

    formattedCreators.push(formattedPacks);
  }

  return (
    <Page title={`${user.name}'s profile`}>
      <>
        <Link href={`/reviews/${user.name}`} passHref>
          <button className='font-bold underline'>
            {`${user.name}'s reviews`}
          </button>
        </Link>
        <br/>
        <br/>
        {formattedCreators.length > 0 ?
          <>{formattedCreators}</> :
          <span>{user.name} has not created any levels</span>
        }
      </>
    </Page>
  );
}
