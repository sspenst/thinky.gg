import React, { useCallback } from 'react';
import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import LinkInfo from '../../models/linkInfo';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import SkeletonPage from '../../components/skeletonPage';
import StatsHelper from '../../helpers/statsHelper';
import World from '../../models/db/world';
import { WorldModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import getSWRKey from '../../helpers/getSWRKey';
import isLocal from '../../lib/isLocal';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useWorldById from '../../hooks/useWorldById';

export async function getStaticPaths() {
  if (isLocal()) {
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

  const worldIds = worlds.filter(world => world.levels.length > 0).map(world => world._id);

  return {
    paths: worldIds.map(worldId => {
      return {
        params: {
          id: worldId.toString(),
        },
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
  const world = await WorldModel.findById<World>(id)
    .populate({
      path: 'levels',
      select: '_id leastMoves name points slug',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', '_id isOfficial name');

  return {
    props: {
      world: JSON.parse(JSON.stringify(world)),
    } as WorldSWRProps,
    revalidate: 60 * 60,
  };
}

interface WorldSWRProps {
  world: World;
}

export default function WorldSWR({ world }: WorldSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return <SkeletonPage/>;
  }

  if (!world) {
    return <SkeletonPage text={'World not found'}/>;
  }

  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey(`/api/world-by-id/${id}`)]: world,
    } }}>
      <WorldPage/>
    </SWRConfig>
  );
}

function WorldPage() {
  const router = useRouter();
  const { id } = router.query;
  const { stats } = useStats();
  const { world } = useWorldById(id);

  const getOptions = useCallback(() => {
    if (!world || !world.levels) {
      return [];
    }

    const levels = world.levels;
    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => new SelectOption(
      level._id.toString(),
      level.name,
      `/level/${level.slug}?wid=${id}`,
      levelStats[index],
      world.userId.isOfficial ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      world.userId.isOfficial ? level.userId.name : undefined,
      level.points,
      '/api/level/image/' + level._id.toString() + '.png',
    ));
  }, [id, stats, world]);

  return (
    <Page
      folders={[
        ... !world || !world.userId.isOfficial ? [new LinkInfo('Catalog', '/catalog')] : [],
        ... world ? [new LinkInfo(world.userId.name, `/universe/${world.userId._id}`)] : [],
      ]}
      title={world?.name ?? 'Loading...'}
    >
      <>
        {!world || !world.authorNote ? null :
          <div
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            {formatAuthorNote(world.authorNote)}
          </div>
        }
        <Select options={getOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
