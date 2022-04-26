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
      .populate<{userId: User}>('userId', 'name'),
    WorldModel.findById<World>(id).populate<{userId: User}>('userId', '_id isOfficial name'),
  ]);

  if (!levels) {
    throw new Error(`Error finding Level by worldId ${id}`);
  }

  if (!world) {
    throw new Error(`Error finding World ${id}`);
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const universe = world.userId;
  const authors = universe.isOfficial ? levels.map(level => level.userId.name) : [];

  return {
    props: {
      authors: JSON.parse(JSON.stringify(authors)),
      levels: JSON.parse(JSON.stringify(levels)),
      universe: JSON.parse(JSON.stringify(universe)),
      world: JSON.parse(JSON.stringify(world)),
    } as WorldSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface WorldSWRProps {
  authors: string[];
  levels: Level[];
  universe: User;
  world: World;
}

export default function WorldSWR({ authors, levels, universe, world }: WorldSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/levelsByWorldId/${id}`)]: levels } }}>
      <WorldPage authors={authors} universe={universe} world={world} />
    </SWRConfig>
  );
}

interface WorldPageProps {
  authors: string[];
  universe: User;
  world: World;
}

function WorldPage({ authors, universe, world }: WorldPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { levels } = useLevelsByWorldId(id);
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level.name,
      `/level/${level._id.toString()}`,
      levelStats[index],
      authors[index] ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      authors[index],
      level.points,
    ));
  }, [authors, levels, stats]);

  return (!world ? null : 
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
