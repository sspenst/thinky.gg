import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import Creator from '../../models/data/pathology/creator';
import Select from '../../components/select';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import SelectOption from '../../models/selectOption';
import SelectOptionStats from '../../models/selectOptionStats';
import Page from '../../components/page';

export const getServerSideProps = async () => {
  const response = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'creators');
  
  if (!response.ok) {
    const message = `An error occurred: ${response.statusText}`;
    console.error(message);
    return;
  }

  const creators: Creator[] = await response.json();
  creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      creators,
    } as CatalogProps
  };
}

interface CatalogProps {
  creators: Creator[];
}

export default function Catalog({ creators }: CatalogProps) {
  const [leastMovesObj, setLeastMovesObj] = useState<{[creatorId: string]: {[levelId: string]: number}}>();
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

    async function getLeastMovesObj() {
      try {
        const response = await fetch(
          process.env.NEXT_PUBLIC_SERVICE_URL + 'levels/allleastmoves',
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

    getLeastMovesObj();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!leastMovesObj || !moves) {
      return;
    }

    setStats(LeastMovesHelper.creatorStats(creators, leastMovesObj, moves));
  }, [leastMovesObj, moves]);

  const getOptions = useCallback(() => {
    const options = [];

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      options.push(new SelectOption(
        `/creator/${creator._id}`,
        stats.length === 0 ? undefined : stats[i],
        creator.name,
      ));
    }
    
    return options;
  }, [stats]);

  return (
    <Page escapeHref={'/'} title={'Catalog'}>
      <Select options={getOptions()}/>
    </Page>
  );
}
