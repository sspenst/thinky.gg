import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import MenuOptions from '../Models/MenuOptions';
import Creator from '../DataModels/Pathology/Creator';
import Select from '../Common/Select';
import LeastMovesHelper from '../Helpers/LeastMovesHelper';
import SelectOption from '../Models/SelectOption';
import SelectOptionStats from '../Models/SelectOptionStats';
import Page from '../Common/Page';

export default function Catalog() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [moves, setMoves] = useState<{[levelId: string]: number}>();
  const [stats, setStats] = useState<SelectOptionStats[]>([]);

  useEffect(() => {
    async function getCreators() {
      const response = await fetch(process.env.REACT_APP_SERVICE_URL + 'creators');

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const creators: Creator[] = await response.json();
      creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
      setCreators(creators);
    }

    async function getMoves() {
      fetch(process.env.REACT_APP_SERVICE_URL + 'moves', {credentials: 'include'})
      .then(async function(res) {
        setMoves(await res.json());
      });
    }
    
    getCreators();
    getMoves();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function getLeastMoves() {
      if (creators.length === 0 || !moves) {
        return;
      }

      try {
        const response = await fetch(
          process.env.REACT_APP_SERVICE_URL + 'levels/allleastmoves',
          { signal: controller.signal },
        );

        if (!response.ok) {
          const message = `An error occurred: ${response.statusText}`;
          window.alert(message);
          return;
        }
        
        setStats(LeastMovesHelper.creatorStats(creators, await response.json(), moves));
      } catch (e) {
        // silently abort
      }
    }

    getLeastMoves();

    return () => controller.abort();
  }, [creators, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      options.push(new SelectOption(
        stats.length === 0 ? undefined : stats[i],
        creator.name,
        {
          pathname: '/creator',
          search: `id=${creator._id}`,
        },
      ));
    }
    
    return options;
  }, [creators, stats]);

  return (
    <Page menuOptions={new MenuOptions('Catalog', '')}>
      <Select options={getOptions()}/>
    </Page>
  );
}
