import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import User from '../../models/db/user';
import World from '../../models/db/world';
import { WorldModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import { useCallback } from 'react';
import useLevelsByWorldId from '../../hooks/useLevelsByWorldId';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useWorld from '../../hooks/useWorld';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const worlds = await WorldModel.find<World>();

  if (!worlds) {
    throw new Error('Error finding Worlds');
  }

  return {
    paths: worlds.map(world => {
      return {
        params: {
          id: world._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface WorldParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as WorldParams;
  const [levels, world] = await Promise.all([
    LevelModel.find<Level>({ worldId: id }, '_id leastMoves name points')
      .populate<{userId: User}>('userId', 'name')
      .sort({ name: 1 }),
    WorldModel.findById<World>(id).populate<{userId: User}>('userId', '_id isOfficial name'),
  ]);

  if (!levels) {
    throw new Error(`Error finding Level by worldId ${id}`);
  }

  if (!world) {
    throw new Error(`Error finding World ${id}`);
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      world: JSON.parse(JSON.stringify(world)),
    } as WorldSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface WorldSWRProps {
  levels: Level[];
  world: World;
}

export default function WorldSWR({ levels, world }: WorldSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/levels-by-world-id/${id}`)]: levels,
      [getSWRKey(`/api/world/${id}`)]: world,
    } }}>
      <WorldPage/>
    </SWRConfig>
  );
}

function WorldPage() {
  const router = useRouter();
  const { id } = router.query;
  const { levels } = useLevelsByWorldId(id);
  const { stats } = useStats();
  const { world } = useWorld(id);

  const getOptions = useCallback(() => {
    if (!levels || !world) {
      return [];
    }

    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level.name,
      `/level/${level._id.toString()}`,
      levelStats[index],
      world.userId.isOfficial ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      world.userId.isOfficial ? level.userId.name : undefined,
      level.points,
    ));
  }, [levels, stats, world]);

  if (!world) {
    return null;
  }

  const universe = world.userId;

  return (
    <Page
      authorNote={world.authorNote}
      folders={[
        new LinkInfo('Catalog', '/catalog'),
        new LinkInfo(universe.name, `/universe/${universe._id}`),
      ]}
      title={world.name}
    >
      <Select options={getOptions()} prefetch={false}/>
    </Page>
  );
}
