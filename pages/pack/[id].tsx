import { useCallback, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
import { GetServerSidePropsContext } from 'next';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Level from '../../models/data/pathology/level';
import Pack from '../../models/data/pathology/pack';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

interface PackParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  const { id } = context.params as PackParams;
  const [packsRes, levelsRes] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?id=${id}`),
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?packId=${id}`),
  ]);

  if (!packsRes.ok) {
    throw new Error(`${packsRes.status} ${packsRes.statusText}`);
  }

  if (!levelsRes.ok) {
    throw new Error(`${levelsRes.status} ${levelsRes.statusText}`);
  }

  const [levels, packs] = await Promise.all([
    levelsRes.json(),
    packsRes.json(),
  ]);
  const pack = packs[0];
  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      levels,
      pack,
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
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
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
      `/level/${level._id}`,
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
