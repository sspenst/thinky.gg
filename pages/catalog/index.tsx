import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import dbConnect from '../../lib/dbConnect';

export async function getStaticProps() {
  await dbConnect();

  const [creators, levels] = await Promise.all([
    CreatorModel.find<Creator>({}, '_id name'),
    LevelModel.find<Level>({}, '_id creatorId leastMoves'),
  ]);

  if (!creators) {
    throw new Error('Error finding Creators');
  }

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const leastMovesObj: {[creatorId: string]: {[levelId: string]: number}} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const creatorId = level.creatorId.toString();

    if (!(creatorId in leastMovesObj)) {
      leastMovesObj[creatorId] = {};
    }

    leastMovesObj[creatorId][level._id.toString()] = level.leastMoves;
  }

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
    fetch('/api/moves', { credentials: 'include' })
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
