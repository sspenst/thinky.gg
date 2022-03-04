import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import Creator from '../../models/data/pathology/creator';
import Pack from '../../models/data/pathology/pack';
import Select from '../../components/select';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Page from '../../components/page';
import { GetServerSidePropsContext } from 'next';

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { id } = context.query;
  const [res1, res2] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `creators?id=${id}`),
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?creatorId=${id}`),
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

  const creators: Creator[] = await res1.json();
  const title = creators[0].name;

  const packs: Pack[] = await res2.json();
  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      packs,
      title,
    } as CreatorPageProps
  };
}

interface CreatorPageProps {
  packs: Pack[];
  title: string;
}

export default function CreatorPage({ packs, title }: CreatorPageProps) {
  const [leastMovesObj, setLeastMovesObj] = useState<{[packId: string]: {[levelId: string]: number}}>();
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
    .then(async function(res) {
      setMoves(await res.json());
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function getLeastMoves() {
      const packIds = packs.map(p => p._id);

      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_SERVICE_URL + `levels/leastmoves?packIds=${packIds.join(',')}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          window.alert(message);
          return;
        }

        setLeastMovesObj(await response.json());
      } catch (e) {
        // silently abort
      }
    }

    getLeastMoves();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!leastMovesObj || !moves) {
      return;
    }

    setStats(LeastMovesHelper.packStats(packs, leastMovesObj, moves));
  }, [leastMovesObj, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < packs.length; i++) {
      const pack = packs[i];

      options.push(new SelectOption(
        `/pack/${pack._id}`,
        stats.length === 0 ? undefined : stats[i],
        pack.name,
      ));
    }
    
    return options;
  }, [stats]);

  return (
    <Page escapeHref={'/catalog'} title={title}>
      <Select options={getOptions()}/>
    </Page>
  );
}
