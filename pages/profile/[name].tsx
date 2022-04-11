import { LevelModel, UserModel } from '../../models/mongoose';
import CreatorTable from '../../components/creatorTable';
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
  if (!user) {
    return <span>User not found!</span>;
  }

  return (
    <Page title={`${user.name}'s profile`}>
      <div
        style={{
          textAlign: 'center',
        }}
      >
        <Link href={`/reviews/${user.name}`} passHref>
          <a className='font-bold underline'>
            {`${user.name}'s reviews`}
          </a>
        </Link>
        <br/>
        <br/>
        {creators.length > 0 ?
          <>
            {creators.map((creator, index) =>
              <CreatorTable
                creator={creator}
                key={index}
                levels={levels}
                packs={packs}
                user={user}
              />
            )}
          </> :
          <span>{user.name} has not created any levels</span>
        }
      </div>
    </Page>
  );
}
