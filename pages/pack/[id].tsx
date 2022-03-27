import { SWRConfig, unstable_serialize } from 'swr';
import Creator from '../../models/data/pathology/creator';
import Dimensions from '../../constants/dimensions';
import Folder from '../../models/folder';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import { LevelModel } from '../../models/mongoose';
import Pack from '../../models/data/pathology/pack';
import { PackModel } from '../../models/mongoose';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useLevelsByPackId from '../../components/useLevelsByPackId';
import { useRouter } from 'next/router';
import useUser from '../../components/useUser';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const packs = await PackModel.find<Pack>();

  if (!packs) {
    throw new Error('Error finding Packs');
  }

  return {
    paths: packs.map(pack => {
      return {
        params: {
          id: pack._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface PackParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as PackParams;
  const [levels, pack] = await Promise.all([
    LevelModel.find<Level>({ packId: id }, '_id author leastMoves name'),
    PackModel.findById<Pack>(id).populate<{creatorId: Creator}>('creatorId', '_id name'),
  ]);

  if (!levels) {
    throw new Error(`Error finding Level by packId ${id})`);
  }

  if (!pack) {
    throw new Error(`Error finding Pack ${id}`);
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      creator: JSON.parse(JSON.stringify(pack.creatorId)),
      levels: JSON.parse(JSON.stringify(levels)),
      pack: JSON.parse(JSON.stringify(pack)),
    } as PackSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface PackSWRProps {
  creator: Creator;
  levels: Level[];
  pack: Pack;
}

export default function PackSWR({ creator, levels, pack }: PackSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [unstable_serialize(`/api/levelsByPackId/${id}`)]: levels } }}>
      <PackPage creator={creator} pack={pack} />
    </SWRConfig>
  );
}

interface LevelsByPackIdRes {
  levels: Level[];
}

interface PackPageProps {
  creator: Creator;
  pack: Pack;
}

function PackPage({ creator, pack }: PackPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { levels }: LevelsByPackIdRes = useLevelsByPackId(id);
  const { user } = useUser();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const stats = StatsHelper.levelStats(levels, user);

    return levels.map((level, index) => new SelectOption(
      level.name,
      `/level/${level._id.toString()}`,
      stats[index],
      Dimensions.OptionHeightLarge,
      level.author,
    ));
  }, [levels, user]);

  return (!pack ? null : 
    <Page
      folders={[
        new Folder('/catalog', 'Catalog'),
        new Folder(`/creator/${creator._id}`, creator.name),
      ]}
      title={pack.name}
    >
      <Select options={getOptions()} prefetch={false}/>
    </Page>
  );
}
