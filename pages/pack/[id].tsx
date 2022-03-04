import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import Pack from '../../models/data/pathology/pack';
import Select from '../../components/select';
import Dimensions from '../../constants/dimensions';
import Level from '../../models/data/pathology/level';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Page from '../../components/page';
import { GetServerSidePropsContext } from 'next';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id } = context.query;
  const [res1, res2] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?id=${id}`),
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `levels?packId=${id}`),
  ]);

  if (!res1.ok) {
    const message = `An error occurred: ${res1.statusText}`;
    console.error(message);
    return;
  }

  if (!res2.ok) {
    const message = `An error occurred: ${res2.statusText}`;
    console.error(message);
    return;
  }

  const packs: Pack[] = await res1.json();
  const pack = packs[0];

  const levels: Level[] = await res2.json();
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
  const [stats, setStats] = useState<SelectOptionStats[]>([]);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
    .then(async function(res) {
      setMoves(await res.json());
    });
  }, []);

  useEffect(() => {
    if (!moves) {
      return;
    }

    setStats(LeastMovesHelper.levelStats(levels, moves));
  }, [moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];

      options.push(new SelectOption(
        `/level/${level._id}`,
        stats.length === 0 ? undefined : stats[i],
        level.name,
        Dimensions.OptionHeightLarge,
        level.author,
      ));
    }
    
    return options;
  }, [stats]);

  return (
    <Page escapeHref={`/creator/${pack.creatorId}`} title={pack.name}>
      <Select
        options={getOptions()}
      />
    </Page>
  );
}
