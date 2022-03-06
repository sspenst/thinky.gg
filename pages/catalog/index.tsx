
import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import dbConnect from '../../lib/dbConnect';

export async function getStaticProps() {
  const leastMovesAsync = fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'levels/allleastmoves');

  await dbConnect();

  const creators = await CreatorModel.find<Creator>();

  if (!creators) {
    throw new Error('Error finding Creators');
  }

  creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const leastMovesRes = await leastMovesAsync;

  if (!leastMovesRes.ok) {
    throw new Error(`${leastMovesRes.status} ${leastMovesRes.statusText}`);
  }

  const [leastMovesObj] = await Promise.all([
    leastMovesRes.json(),
  ]);

  return {
    props: {
      creators: JSON.parse(JSON.stringify(creators)),
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
      `/creator/${creator._id.toString()}`,
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
