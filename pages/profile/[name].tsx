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
    ).populate<{packId: Pack}>('packId', '_id name').sort({ ts: -1 });
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packs: Pack[] = [...new Set(levels.map(level => level.packId as unknown as Pack))];

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      packs: JSON.parse(JSON.stringify(packs)),
      user: JSON.parse(JSON.stringify(user)),
    } as ProfileProps,
  };
}

interface ProfileProps {
  levels: Level[];
  packs: Pack[];
  user: User | undefined;
}

export default function Profile({ levels, packs, user }: ProfileProps) {
  if (!user) {
    return <span>User not found!</span>;
  }

  const formattedPacks = [];

  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    const formattedLevels = [];

    for (let j = 0; j < levels.length; j++) {
      const level = levels[j];

      if (level.packId._id !== pack._id) {
        continue;
      }
  
      formattedLevels.push(
        <li key={`${i}-${j}`} style={{marginLeft: 20}}>
          <Link href={`/level/${level._id}`} passHref>
            <button className='font-bold underline'>
              {level.name}
            </button>
          </Link>
        </li>
      );
    }

    formattedPacks.push(
      <li key={i}>
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
  
  return (
    <Page title={`${user.name}'s profile`}>
      <>
        <Link href={`/reviews/${user.name}`} passHref>
          <button className='font-bold underline'>
            {`${user.name}'s reviews`}
          </button>
        </Link>
        {packs.length === 0 ? null : <>
          <br/>
          <br/>
          <Link href={`/creator/${user._id}`} passHref>
            <button className='font-bold underline'>
              {`${user.name}'s levels:`}
            </button>
          </Link>
          <ul>
            {formattedPacks}
          </ul>
        </>}
      </>
    </Page>
  );
}
