import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import User from '../../models/data/pathology/user';
import dbConnect from '../../lib/dbConnect';

export async function getStaticProps() {
  await dbConnect();

  const [creators, levels] = await Promise.all([
    CreatorModel.find<Creator>({}, '_id name'),
    LevelModel.find<Level>({}, '_id creatorId'),
  ]);

  if (!creators) {
    throw new Error('Error finding Creators');
  }

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  creators.sort((a: Creator, b: Creator) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const creatorsToLevelIds: {[creatorId: string]: string[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const creatorId = level.creatorId.toString();

    if (!(creatorId in creatorsToLevelIds)) {
      creatorsToLevelIds[creatorId] = [];
    }

    creatorsToLevelIds[creatorId].push(level._id.toString());
  }

  return {
    props: {
      creators: JSON.parse(JSON.stringify(creators)),
      creatorsToLevelIds,
    } as CatalogProps,
  };
}

interface CatalogProps {
  creators: Creator[];
  creatorsToLevelIds: {[creatorId: string]: string[]};
}

export default function Catalog({ creators, creatorsToLevelIds }: CatalogProps) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
    .then(async function(res) {
      setUser(await res.json());
    });
  }, []);

  const getOptions = useCallback(() => {
    const stats = StatsHelper.creatorStats(creators, creatorsToLevelIds, user);

    return creators.map((creator, index) => new SelectOption(
      `/creator/${creator._id.toString()}`,
      stats[index],
      creator.name,
    ));
  }, [creators, creatorsToLevelIds, user]);

  return (
    <Page escapeHref={'/'} title={'Catalog'}>
      <Select options={getOptions()}/>
    </Page>
  );
}
