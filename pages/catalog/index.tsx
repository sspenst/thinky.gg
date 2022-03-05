
import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';

export async function getStaticProps() {
  const [creatorsRes, leastMovesRes] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'creators'),
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'levels/allleastmoves'),
  ]);

  if (!creatorsRes.ok) {
    throw new Error(`${creatorsRes.status} ${creatorsRes.statusText}`);
  }

  if (!leastMovesRes.ok) {
    throw new Error(`${leastMovesRes.status} ${leastMovesRes.statusText}`);
  }

  const [creators, leastMovesObj] = await Promise.all([
    creatorsRes.json(),
    leastMovesRes.json(),
  ]);
  creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      creators,
      leastMovesObj,
    } as CatalogProps,
  };
}

interface CatalogProps {
  creators: Creator[];
  leastMovesObj: {[creatorId: string]: {[levelId: string]: number}};
}

export default function Catalog({ creators, leastMovesObj }: CatalogProps) {
  const [moves, setMoves] = useState<{[levelId: string]: number}>();

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
    .then(async function(res) {
      setMoves(await res.json());
    });
  }, []);

  const getOptions = useCallback(() => {
    const stats = LeastMovesHelper.creatorStats(creators, leastMovesObj, moves);

    return creators.map((creator, index) => new SelectOption(
      `/creator/${creator._id}`,
      stats[index],
      creator.name,
    ));
  }, [creators, leastMovesObj, moves]);

  return (
    <Page escapeHref={'/'} title={'Catalog'}>
      <Select options={getOptions()}/>
    </Page>
  );
}
