import { SWRConfig, unstable_serialize } from 'swr';
import Creator from '../../models/data/pathology/creator';
import Folder from '../../models/folder';
import Game from '../../components/level/game';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import { LevelModel } from '../../models/mongoose';
import Pack from '../../models/data/pathology/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import dbConnect from '../../lib/dbConnect';
import useLevel from '../../components/useLevel';
import { useRouter } from 'next/router';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const levels = await LevelModel.find<Level>();

  if (!levels) {
    throw new Error('Error finding Packs');
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
    .populate<{creatorId: Creator}>('creatorId', '_id name')
    .populate<{packId: Pack}>('packId', '_id name');

  if (!level) {
    throw new Error(`Error finding Level ${id}`);
  }

  return {
    props: {
      creator: JSON.parse(JSON.stringify(level.creatorId)),
      level: JSON.parse(JSON.stringify(level)),
      pack: JSON.parse(JSON.stringify(level.packId)),
    } as LevelSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface LevelSWRProps {
  creator: Creator;
  level: Level;
  pack: Pack;
}

export default function LevelSWR({ creator, level, pack }: LevelSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [unstable_serialize(`/api/level/${id}`)]: level } }}>
      <LevelPage creator={creator} pack={pack} />
    </SWRConfig>
  );
}

interface LevelPageProps {
  creator: Creator;
  pack: Pack;
}

function LevelPage({ creator, pack }: LevelPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { level } = useLevel(id);

  return (!level ? null :
    <Page
      folders={[
        new Folder('/catalog', 'Catalog'),
        new Folder(`/creator/${creator._id}`, creator.name),
        new Folder(`/pack/${pack._id}`, pack.name),
      ]}
      subtitle={level.author}
      title={level.name}
    >
      <Game key={level._id.toString()} level={level}/>
    </Page>
  );
}
