import Creator from '../../models/data/pathology/creator';
import { CreatorModel } from '../../models/mongoose';
import Level from '../../models/data/pathology/level';
import { LevelModel } from '../../models/mongoose';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useUser from '../../components/useUser';

export async function getStaticProps() {
  await dbConnect();

  const [creators, levels] = await Promise.all([
    CreatorModel.find<Creator>({}, '_id name official'),
    LevelModel.find<Level>({}, '_id creatorId'),
  ]);

  if (!creators) {
    throw new Error('Error finding Creators');
  }

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  creators.sort((a: Creator, b: Creator) => {
    if (a.official === b.official) {
      return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
    }

    return a.official ? -1 : 1;
  });

  const creatorsToLevelIds: {[creatorId: string]: Types.ObjectId[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const creatorId = level.creatorId.toString();

    if (!(creatorId in creatorsToLevelIds)) {
      creatorsToLevelIds[creatorId] = [];
    }

    creatorsToLevelIds[creatorId].push(level._id);
  }

  return {
    props: {
      creators: JSON.parse(JSON.stringify(creators)),
      creatorsToLevelIds: JSON.parse(JSON.stringify(creatorsToLevelIds)),
    } as CatalogProps,
  };
}

interface CatalogProps {
  creators: Creator[];
  creatorsToLevelIds: {[creatorId: string]: Types.ObjectId[]};
}

export default function Catalog({ creators, creatorsToLevelIds }: CatalogProps) {
  const { user } = useUser();

  const getOptions = useCallback(() => {
    const options = [];
    const stats = StatsHelper.creatorStats(creators, creatorsToLevelIds, user);

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];

      options.push(new SelectOption(
        creator.name,
        `/creator/${creator._id.toString()}`,
        stats[i],
      ));

      // add space between official and custom levels
      if (creator.official && !creators[i + 1].official) {
        options.push(undefined);
      }
    }

    return options;
  }, [creators, creatorsToLevelIds, user]);

  return (
    <Page title={'Catalog'}>
      <Select options={getOptions()}/>
    </Page>
  );
}
