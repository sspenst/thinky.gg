import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import { UserModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useStats from '../../hooks/useStats';

export async function getStaticProps() {
  await dbConnect();

  const [levels, universes] = await Promise.all([
    LevelModel.find<Level>({}, '_id officialUserId userId'),
    UserModel.find<User>({ isUniverse: true }, '_id isOfficial name')
      .sort({ isOfficial: -1, name: 1 }),
  ]);

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  if (!universes) {
    throw new Error('Error finding Users');
  }

  const universesToLevelIds: {[userId: string]: Types.ObjectId[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const userId = level.officialUserId?.toString() ?? level.userId.toString();

    if (!(userId in universesToLevelIds)) {
      universesToLevelIds[userId] = [];
    }

    universesToLevelIds[userId].push(level._id);
  }

  return {
    props: {
      universes: JSON.parse(JSON.stringify(universes)),
      universesToLevelIds: JSON.parse(JSON.stringify(universesToLevelIds)),
    } as CatalogProps,
  };
}

interface CatalogProps {
  universes: User[];
  universesToLevelIds: {[userId: string]: Types.ObjectId[]};
}

export default function Catalog({ universes, universesToLevelIds }: CatalogProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    const options = [];
    const universeStats = StatsHelper.universeStats(stats, universes, universesToLevelIds);

    for (let i = 0; i < universes.length; i++) {
      const universe = universes[i];

      options.push(new SelectOption(
        universe.name,
        `/universe/${universe._id.toString()}`,
        universeStats[i],
      ));

      // add space between official and custom levels
      if (universe.isOfficial && !universes[i + 1].isOfficial) {
        options.push(undefined);
      }
    }

    return options.filter(option => option ? option.stats?.total : true);
  }, [stats, universes, universesToLevelIds]);

  return (
    <Page title={'Catalog'}>
      <Select options={getOptions()}/>
    </Page>
  );
}
