import React, { useCallback } from 'react';

import Dimensions from '../../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import LinkInfo from '../../../models/linkInfo';
import Page from '../../../components/page';
import { ParsedUrlQuery } from 'querystring';
import { SWRConfig } from 'swr';
import Select from '../../../components/select';
import SelectOption from '../../../models/selectOption';
import SkeletonPage from '../../../components/skeletonPage';
import StatsHelper from '../../../helpers/statsHelper';
import World from '../../../models/db/world';
import { WorldModel } from '../../../models/mongoose';
import cleanAuthorNote from '../../../helpers/cleanAuthorNote';
import dbConnect from '../../../lib/dbConnect';
import getSWRKey from '../../../helpers/getSWRKey';
import { useRouter } from 'next/router';
import useStats from '../../../hooks/useStats';
import useWorldById from '../../../hooks/useWorldById';

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
      <WorldEditPage/>
    </SWRConfig>
  );
}

function WorldEditPage() {
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
      level.name,
      level.isDraft ? `/edit/${level._id.toString()}` : `/level/${level._id.toString()}`,
      levelStats[index],
      world.userId.isOfficial ? Dimensions.OptionHeightLarge : Dimensions.OptionHeightMedium,
      world.userId.isOfficial ? level.userId.name : undefined,
      level.points,
      false, // disabled
      true // draggable
    ));
  }, [id, stats, world]);

  return (
    <Page
      folders={[
        ... !world || !world.userId.isOfficial ? [new LinkInfo('Create', '/create')] : [],
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
