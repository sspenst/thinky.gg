import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import LinkInfo from '../../models/linkInfo';
import Pack from '../../models/db/pack';
import { PackModel } from '../../models/mongoose';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { SWRConfig } from 'swr';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import getSWRKey from '../../helpers/getSWRKey';
import { useCallback } from 'react';
import useLevelsByPackId from '../../hooks/useLevelsByPackId';
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
    LevelModel.find<Level>({ packId: id }, '_id leastMoves name')
      .populate<{originalUserId: User}>('originalUserId', 'name'),
    PackModel.findById<Pack>(id).populate<{userId: User}>('userId', '_id name'),
  ]);

  if (!levels) {
    throw new Error(`Error finding Level by packId ${id})`);
  }

  if (!pack) {
    throw new Error(`Error finding Pack ${id}`);
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const authors = levels.map(level => level.originalUserId?.name ?? '');

  return {
    props: {
      authors: JSON.parse(JSON.stringify(authors)),
      creator: JSON.parse(JSON.stringify(pack.userId)),
      levels: JSON.parse(JSON.stringify(levels)),
      pack: JSON.parse(JSON.stringify(pack)),
    } as PackSWRProps,
    revalidate: 60 * 60 * 24,
  };
}

interface PackSWRProps {
  authors: string[];
  creator: User;
  levels: Level[];
  pack: Pack;
}

export default function PackSWR({ authors, creator, levels, pack }: PackSWRProps) {
  const router = useRouter();
  const { id } = router.query;

  return (!id ? null :
    <SWRConfig value={{ fallback: { [getSWRKey(`/api/levelsByPackId/${id}`)]: levels } }}>
      <PackPage authors={authors} creator={creator} pack={pack} />
    </SWRConfig>
  );
}

interface PackPageProps {
  authors: string[];
  creator: User;
  pack: Pack;
}

function PackPage({ authors, creator, pack }: PackPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const { levels } = useLevelsByPackId(id);
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const levelStats = StatsHelper.levelStats(levels, stats);

    return levels.map((level, index) => {
      const selectOption = new SelectOption(
        level.name,
        `/level/${level._id.toString()}`,
        levelStats[index],
      );

      if (authors[index]) {
        selectOption.height = Dimensions.OptionHeightLarge;
        selectOption.subtext = authors[index];
      }

      return selectOption;
    });
  }, [authors, levels, stats]);

  return (!pack ? null : 
    <Page
      folders={[
        new LinkInfo('Catalog', '/catalog'),
        new LinkInfo(creator.name, `/creator/${creator._id}`),
      ]}
      title={pack.name}
    >
      <Select options={getOptions()} prefetch={false}/>
    </Page>
  );
}
