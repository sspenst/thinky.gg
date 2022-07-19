import React, { useCallback, useState } from 'react';
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
import { useRouter } from 'next/router';
import useStats from '../../hooks/useStats';
import useWorldById from '../../hooks/useWorldById';
import DataTable, { Alignment } from 'react-data-table-component';
import { EnrichedLevel, dataTableStyle } from '../search';
import moment from 'moment';
import Link from 'next/link';
import getPngDataClient from '../../helpers/getPngDataClient';
import Image from 'next/image';
import Level from '../../models/db/level';

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
  const router = useRouter();
  const { id } = router.query;
  const { stats } = useStats();
  const { world } = useWorldById(id);
  const levels = world?.levels ?? [];
  const enrichWithStats = useCallback((levels: EnrichedLevel[]) => {
    const levelStats = StatsHelper.levelStats(levels, stats);

    for (let i = 0; i < levels.length; i++) {
      levels[i].stats = levelStats[i];
    }

    return levels;
  }, [stats]);
  const [data, setData] = useState(enrichWithStats(levels));
  // pass in level props
  const expandedLevelComponent = useCallback((props: any) => {
    const level = props.data;
    const bg = getPngDataClient(level);

    return <div className='flex justify-left md:justify-start' style={{
      backgroundColor: 'rgb(38, 38, 38)',
    }}>
      <div className='flex items-center p-3'
        style={{
          minWidth: '30%',
        }} >
        <Link passHref href={'/level/' + level.slug} className='text-2xl font-bold underline'>
          <a
            className='font-bold underline'
            style={{
              color: level.stats.userTotal ? level.stats.userTotal === level.stats.total ? 'var(--color-complete)' : 'var(--color-incomplete)' : 'white',
            }}
          >
            {level.name}
          </a>
        </Link>
      </div>
      <div className='p-3'>
        <Image src={bg} width={Dimensions.LevelCanvasWidth / 5} height={Dimensions.LevelCanvasHeight / 5} alt={level.name}/>
      </div>

    </div>;
  }, []);
  const [filterText, setFilterText] = React.useState('');

  const filteredItems = levels.filter(
    (level:Level) => level.name && level.name.toLowerCase().includes(filterText.toLowerCase()),
  );
  const subHeaderComponentMemo = React.useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText('');
      }
    };

    return (
      <div>
        <input type='text' className='rounded-sm text-gray-800 bg-gray-200 h-6 w-30 p-1' placeholder={'Search ' + world?.levels.length + ' levels...'} onChange={e => setFilterText(e.target.value)} value={filterText} />
      </div>
    );
  }, [filterText]);

  return (
    <Page
      folders={[
        ... !world || !world.userId.isOfficial ? [new LinkInfo('Catalog', '/catalog')] : [],
        ... world ? [new LinkInfo(world.userId.name, `/universe/${world.userId._id}`)] : [],
      ]}
      title={world?.name ?? 'Loading...'}
    >
      <>
        <h1 className='text-2xl text-center p-3'>
          {world?.name}
        </h1>
        {!world || !world.authorNote ? null :
          <div
            style={{
              textAlign: 'center',
            }}
          >
            {formatAuthorNote(world.authorNote)}
          </div>
        }

        <DataTable
          columns={[
            /* {
              id: 'name',
              name: 'Name',
              grow: 3,
              selector: (row: EnrichedLevel) => row.name,
              ignoreRowClick: true,
              cell: (row: EnrichedLevel) =>
                <div style={{
                  backgroundImage: `${getPngDataClient(row)}`,
                }}><Link href={'/level/' + row.slug}><a className='font-bold underline'>{row.name}</a></Link></div>,
              conditionalCellStyles: [
                {
                  when: (row: EnrichedLevel) => row.stats?.userTotal ? row.stats.userTotal > 0 : false,
                  style: (row: EnrichedLevel) => ({
                    color: row.stats ? row.stats.userTotal === row.stats.total ? 'var(--color-complete)' : 'var(--color-incomplete)' : undefined,
                  }),
                },
              ]
            },*/
            {
              id: 'ts',
              name: 'Created',
              grow: 1,
              selector: (row: EnrichedLevel) => row.ts,
              format: (row: EnrichedLevel) => moment.unix(row.ts).fromNow(),
              sortable: true
            },
            {
              grow: 0.5,
              id: 'Steps',
              name: 'Steps',
              selector: (row: EnrichedLevel) => row.leastMoves,
              format: (row: EnrichedLevel) => row.stats?.userTotal ? row.stats?.userTotal + '/' + row.leastMoves : row.leastMoves,
              sortable: true
            },
            {
              grow: 0.5,
              id: 'won',
              name: 'Users Won',
              selector: (row: EnrichedLevel) => row.calc_stats_players_beaten || 0,
              sortable: true
            },
            {
              id: 'reviews_score',
              name: 'Review Score',
              selector: (row: EnrichedLevel) => row.calc_reviews_score_laplace?.toFixed(2),
              sortField: 'reviews_score',
              sortable: true
            },

          ]}
          data={filteredItems}
          pagination={true}
          paginationComponentOptions={{ noRowsPerPage: true }}
          paginationPerPage={5}
          dense
          customStyles={dataTableStyle}
          fixedHeader
          persistTableHead
          responsive
          defaultSortFieldId={'ts'}
          defaultSortAsc={false}
          subHeader
          subHeaderAlign={Alignment.CENTER}
          expandableRows={true}
          expandableRowExpanded={() => true}
          expandableRowsComponent={expandedLevelComponent}
          expandableRowsHideExpander={true}
          subHeaderComponent={subHeaderComponentMemo}
        ></DataTable>

      </>
    </Page>
  );
}
