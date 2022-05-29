import { GetServerSidePropsContext } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import React, { useCallback } from 'react';
import { SWRConfig } from 'swr';
import Page from '../../components/page';
import Select from '../../components/select';
import SkeletonPage from '../../components/skeletonPage';
import Dimensions from '../../constants/dimensions';
import cleanAuthorNote from '../../helpers/cleanAuthorNote';
import getSWRKey from '../../helpers/getSWRKey';
import StatsHelper from '../../helpers/statsHelper';
import useStats from '../../hooks/useStats';
import useWorldById from '../../hooks/useWorldById';
import dbConnect from '../../lib/dbConnect';
import World from '../../models/db/world';
import LinkInfo from '../../models/linkInfo';
import { WorldModel } from '../../models/mongoose';
import SelectOption from '../../models/selectOption';

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
      select: '_id leastMoves name points',
      match: { isDraft: false },
      populate: { path: 'userId', model: 'User', select: 'name' },
    })
    .populate('userId', '_id isOfficial name');

  if (!world) {
    throw new Error(`Error finding World ${id}`);
  }

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

    const levels = world.levels.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
    const levelStats = StatsHelper.levelStats(levels, stats);
    return levels.map((level, index) => new SelectOption(
      level.name,
      `/level/${level.userId.name}/${level.slug}?wid=${id}`,
      levelStats[index],
      world.userId.isOfficial ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      world.userId.isOfficial ? level.userId.name : undefined,
      level.points,
    ));
  }, [id, stats, world]);

  return (
    <Page
      folders={[
        new LinkInfo('Catalog', '/catalog'),
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
            <span style={{whiteSpace: 'pre-wrap'}}>{cleanAuthorNote(world.authorNote)}</span>
          </div>
        }
        <Select options={getOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
