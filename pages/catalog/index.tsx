import Page from '../../components/page';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import { Types } from 'mongoose';
import User from '../../models/db/user';
import World from '../../models/db/world';
import { WorldModel } from '../../models/mongoose';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useStats from '../../hooks/useStats';

export async function getStaticProps() {
  await dbConnect();

  const worlds = await WorldModel.find()
    .populate('userId', 'isOfficial name')
    .populate({
      path: 'levels',
      select: '_id',
      match: { isDraft: false },
    });

  if (!worlds) {
    throw new Error('Error finding Worlds');
  }

  return {
    props: {
      worlds: JSON.parse(JSON.stringify(worlds)),
    } as CatalogProps,
    revalidate: 60 * 60,
  };
}

interface CatalogProps {
  worlds: World[];
}

export default function Catalog({ worlds }: CatalogProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!worlds) {
      return [];
    }

    const universes: User[] = [];
    const universesToLevelIds: {[userId: string]: Types.ObjectId[]} = {};

    for (let i = 0; i < worlds.length; i++) {
      const world: World = worlds[i];

      if (world.levels.length === 0) {
        continue;
      }

      const user: User = world.userId;
      const universeId = user._id.toString();

      if (!(universeId in universesToLevelIds)) {
        universes.push(user);
        universesToLevelIds[universeId] = [];
      }

      for (let j = 0; j < world.levels.length; j++) {
        const levelId = world.levels[j]._id;

        if (!universesToLevelIds[universeId].includes(levelId)) {
          universesToLevelIds[universeId].push(levelId);
        }
      }
    }

    universes.sort((a, b) => {
      if (a.isOfficial === b.isOfficial) {
        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
      }

      return a.isOfficial ? -1 : 1;
    });

    const officialOptions = [];
    const options = [];
    const universeStats = StatsHelper.universeStats(stats, universes, universesToLevelIds);

    for (let i = 0; i < universes.length; i++) {
      const universe = universes[i];
      const option = new SelectOption(
        universe.name,
        `/universe/${universe._id.toString()}`,
        universeStats[i],
      );

      if (universe.isOfficial) {
        officialOptions.push(option);
      } else {
        options.push(option);
      }
    }

    return (<>
      <Select options={officialOptions.filter(option => option ? option.stats?.total : true)}/>
      <div style={{ height: 32 }}/>
      <Select options={options.filter(option => option ? option.stats?.total : true)}/>
    </>);
  }, [stats, worlds]);

  return (
    <Page title={'Catalog'}>
      <>
        {getOptions()}
      </>
    </Page>
  );
}
