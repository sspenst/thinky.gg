import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Pack from '../../models/db/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import useLevel from '../../hooks/useLevel';
import { useRouter } from 'next/router';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  // NB: only get official levels to optimize build time
  const levels = await LevelModel.find<Level>({ officialUserId: { $exists: true } });

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  return {
    paths: levels.map(level => {
      return {
        params: {
          id: level._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface LevelParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as LevelParams;
  const level = await LevelModel.findById<Level>(id)
    .populate<{officialUserId: User}>('officialUserId', 'name')
    .populate<{packId: Pack}>('packId', '_id name')
    .populate<{userId: User}>('userId', '_id name');

  if (!level) {
    throw new Error(`Error finding Level ${id}`);
  }

  return {
    props: {
      author: level.officialUserId ? level.userId.name : '',
      creator: JSON.parse(JSON.stringify(level.officialUserId ?? level.userId)),
      level: JSON.parse(JSON.stringify(level)),
      pack: JSON.parse(JSON.stringify(level.packId)),
    } as LevelSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface LevelSWRProps {
  author: string;
  creator: User;
  level: Level;
  pack: Pack;
}

export default function LevelSWR({ author, creator, level, pack }: LevelSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/level/${id}`)]: level } }}>
      <LevelPage author={author} creator={creator} pack={pack} />
    </SWRConfig>
  );
}

interface LevelPageProps {
  author: string;
  creator: User;
  pack: Pack;
}

function LevelPage({ author, creator, pack }: LevelPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { level } = useLevel(id);

  return (!level ? null :
    <Page
      folders={[
        new LinkInfo('Catalog', '/catalog'),
        new LinkInfo(creator.name, `/creator/${creator._id}`),
        new LinkInfo(pack.name, `/pack/${pack._id}`),
      ]}
      level={level}
      subtitle={author}
      subtitleHref={`/profile/${author}`}
      title={level.name}
    >
      <Game key={level._id.toString()} level={level} pack={pack} />
    </Page>
  );
}
