import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useRouter } from 'next/router';
import Creator from '../../components/DataModels/Pathology/Creator';
import Pack from '../../components/DataModels/Pathology/Pack';
import Select from '../../components/Common/Select';
import LeastMovesHelper from '../../components/Helpers/LeastMovesHelper';
import SelectOption from '../../components/Models/SelectOption';
import SelectOptionStats from '../../components/Models/SelectOptionStats';
import Page from '../../components/Common/Page';

export default function CreatorPage() {
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [packs, setPacks] = useState<Pack[]>([]);
  const router = useRouter();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);
  const [title, setTitle] = useState<string>();
  const { id } = router.query;

  useEffect(() => {
    async function getCreator() {
      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `creators?id=${id}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators: Creator[] = await response.json();
      const creator = creators[0];

      setTitle(creator.name);
    }

    async function getPacks() {
      const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?creatorId=${id}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setPacks(packs);
    }

    if (!id) {
      return;
    }

    async function getMoves() {
      fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }
  
    getCreator();
    getPacks();
    getMoves();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    async function getLeastMoves() {
      if (!moves || packs.length === 0) {
        return;
      }

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
        
        setStats(LeastMovesHelper.packStats(packIds, await response.json(), moves));
      } catch (e) {
        // silently abort
      }
    }

    getLeastMoves();

    return () => controller.abort();
  }, [moves, packs]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < packs.length; i++) {
      const pack = packs[i];

      options.push(new SelectOption(
        `/pack?id=${pack._id}`,
        stats.length === 0 ? undefined : stats[i],
        pack.name,
      ));
    }
    
    return options;
  }, [packs, stats]);

  return (
    <Page needsAuth={true} escapeHref={'/catalog'} title={title}>
      <Select options={getOptions()}/>
    </Page>
  );
}
