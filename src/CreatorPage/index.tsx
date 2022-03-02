import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import { useSearchParams } from 'react-router-dom';
import Creator from '../DataModels/Pathology/Creator';
import Pack from '../DataModels/Pathology/Pack';
import Select from '../Common/Select';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';
import SelectOption from '../Models/SelectOption';
import SelectOptionStats from '../Models/SelectOptionStats';
import Page from '../Common/Page';

export default function CreatorPage() {
  const [menuOptions, setMenuOptions] = useState<MenuOptions>();
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);
  const creatorId = searchParams.get('id');

  useEffect(() => {
    async function getCreator() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `creators?id=${creatorId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators: Creator[] = await response.json();
      const creator = creators[0];

      setMenuOptions(new MenuOptions(creator.name, 'catalog'));
    }

    async function getPacks() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + `packs?creatorId=${creatorId}`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const packs: Pack[] = await response.json();
      packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setPacks(packs);
    }

    if (!creatorId) {
      return;
    }

    async function getMoves() {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }
  
    getCreator();
    getPacks();
    getMoves();
  }, [creatorId]);

  useEffect(() => {
    const controller = new AbortController();

    async function getLeastMoves() {
      if (!moves || packs.length === 0) {
        return;
      }

      const packIds = packs.map(p => p._id);

      try {
        const response = await fetch(
          process.env.REACT_APP_SERVICE_URL + `levels/leastmoves?packIds=${packIds.join(',')}`,
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
        stats.length === 0 ? undefined : stats[i],
        pack.name,
        {
          pathname: '/pack',
          search: `id=${pack._id}`,
        },
      ));
    }
    
    return options;
  }, [packs, stats]);

  return (
    <Page menuOptions={menuOptions}>
      <Select options={getOptions()}/>
    </Page>
  );
}
