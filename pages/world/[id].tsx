import React, { useCallback, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { FilterButton } from '../search';
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
import filterSelectOptions from '../../helpers/filterSelectOptions';
import formatAuthorNote from '../../helpers/formatAuthorNote';
import getSWRKey from '../../helpers/getSWRKey';
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useWorldById from '../../hooks/useWorldById';

export async function getStaticPaths() {
  return {
    paths: [],
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
  const [filterText, setFilterText] = useState('');
  const router = useRouter();
  const [showFilter, setShowFilter] = useState('');
  const { stats } = useStats();
  const { id } = router.query;
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
      level,
    ));
  }, [id, stats, world]);

  const getFilteredOptions = useCallback(() => {
    return filterSelectOptions(getOptions(), showFilter, filterText);
  }, [filterText, getOptions, showFilter]);

  const onPersonalFilterClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setShowFilter(showFilter === e.currentTarget.value ? 'all' : e.currentTarget.value);
  };

  return (
    <Page
      folders={[
        ... !world || !world.userId.isOfficial ? [new LinkInfo('Catalog', '/catalog/all')] : [],
        ... world ? [new LinkInfo(world.userId.name, `/universe/${world.userId._id}`)] : [],
      ]}
      title={world?.name ?? 'Loading...'}
    >
      <>
        <h1 className='text-2xl text-center pb-1 pt-3'>
          {world?.name}
        </h1>
        {!world || !world.authorNote ? null :
          <div className='p-2'
            style={{
              textAlign: 'center',
            }}
          >
            {formatAuthorNote(world.authorNote)}
          </div>
        }
        <div className='flex justify-center pt-2'>
          <div className='flex items-center justify-center' role='group'>
            <FilterButton first={true} onClick={onPersonalFilterClick} selected={showFilter === 'hide_won'} text='Hide Won' value='hide_won' />
            <FilterButton last={true} onClick={onPersonalFilterClick} selected={showFilter === 'only_attempted'} text='Show In Progress' value='only_attempted' />
            <div className='p-2'>
              <input type='search' className='form-control relative flex-auto min-w-0 block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none' aria-label='Search' aria-describedby='button-addon2' placeholder={'Search ' + world?.levels.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
            </div>
          </div>
        </div>
        <Select options={getFilteredOptions()} prefetch={false}/>
      </>
    </Page>
  );
}
