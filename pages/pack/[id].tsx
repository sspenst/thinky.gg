import { useCallback, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Pack from '../../models/data/pathology/pack';
import PackModel from '../../models/mongoose/packModel';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import dbConnect from '../../lib/dbConnect';

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
    PackModel.findById<Pack>(id),
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
      levels: JSON.parse(JSON.stringify(levels)),
      pack: JSON.parse(JSON.stringify(pack)),
    } as PackPageProps
  };
}

interface PackPageProps {
  levels: Level[];
  pack: Pack;
}

export default function PackPage({ levels, pack }: PackPageProps) {
  const [moves, setMoves] = useState<{[levelId: string]: number}>();

  useEffect(() => {
    fetch('/api/moves', { credentials: 'include' })
    .then(async function(res) {
      setMoves(await res.json());
    });
  }, []);

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const stats = LeastMovesHelper.levelStats(levels, moves);

    return levels.map((level, index) => new SelectOption(
      `/level/${level._id.toString()}`,
      stats[index],
      level.name,
      Dimensions.OptionHeightLarge,
      level.author,
    ));
  }, [levels, moves]);

  return (!pack ? null : 
    <Page escapeHref={`/creator/${pack.creatorId}`} title={pack.name}>
      <Select
        options={getOptions()}
      />
    </Page>
  );
}
