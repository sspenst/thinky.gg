import React, { useCallback } from 'react';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import Page from '../../components/page';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import dbConnect from '../../lib/dbConnect';
import useStats from '../../hooks/useStats';

export async function getStaticProps() {
  await dbConnect();

  const levels = await LevelModel.find({ isDraft: false }, '_id')
    .populate('userId', 'name');

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
    } as CatalogProps,
    revalidate: 60 * 60,
  };
}

interface CatalogProps {
  levels: Level[];
}

export default function Catalog({ levels }: CatalogProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const universes: User[] = [];
    const universesToLevelIds: {[userId: string]: Types.ObjectId[]} = {};

    for (let i = 0; i < levels.length; i++) {
      const level: Level = levels[i];
      const user: User = level.userId;
      const universeId = user._id.toString();

      if (!(universeId in universesToLevelIds)) {
        universes.push(user);
        universesToLevelIds[universeId] = [];
      }

      universesToLevelIds[universeId].push(level._id);
    }

    universes.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

    const options = [];
    const universeStats = StatsHelper.universeStats(stats, universes, universesToLevelIds);

    for (let i = 0; i < universes.length; i++) {
      options.push(new SelectOption(
        universes[i]._id.toString(),
        universes[i].name,
        `/universe/${universes[i]._id.toString()}`,
        universeStats[i],
      ));
    }

    return (
      <Select options={options.filter(option => option ? option.stats?.total : true)}/>
    );
  }, [levels, stats]);

  return (
    <Page title={'Catalog'}>
      <>
        {getOptions()}
      </>
    </Page>
  );
}
