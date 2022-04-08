import Folder from '../../models/folder';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/db/level';
import { LevelModel } from '../../models/mongoose';
import Pack from '../../models/db/pack';
import { PackModel } from '../../models/mongoose';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
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

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const creators = await UserModel.find<User>({ isCreator: true });

  if (!creators) {
    throw new Error('Error finding Users');
  }

  return {
    paths: creators.map(creator => {
      return {
        params: {
          id: creator._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface CreatorParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as CreatorParams;
  const [creator, levels, packs] = await Promise.all([
    UserModel.findOne<User>({ _id: id, isCreator: true }, 'name'),
    LevelModel.find<Level>({ userId: id }, '_id packId'),
    PackModel.find<Pack>({ userId: id }, '_id name'),
  ]);

  if (!creator) {
    throw new Error(`Error finding User ${id}`);
  }

  if (!levels) {
    throw new Error('Error finding Levels by packIds');
  }
  
  if (!packs) {
    throw new Error(`Error finding Pack by userId ${id})`);
  }

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packsToLevelIds: {[packId: string]: Types.ObjectId[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const packId = level.packId.toString();

    if (!(packId in packsToLevelIds)) {
      packsToLevelIds[packId] = [];
    }

    packsToLevelIds[packId].push(level._id);
  }

  return {
    props: {
      packs: JSON.parse(JSON.stringify(packs)),
      packsToLevelIds: JSON.parse(JSON.stringify(packsToLevelIds)),
      title: creator.name,
    } as CreatorPageProps,
  };
}

interface CreatorPageProps {
  packs: Pack[];
  packsToLevelIds: {[packId: string]: Types.ObjectId[]};
  title: string;
}

export default function CreatorPage({ packs, packsToLevelIds, title }: CreatorPageProps) {
  const { stats } = useStats();

  const getOptions = useCallback(() => {
    if (!packs) {
      return [];
    }

    const packStats = StatsHelper.packStats(packs, packsToLevelIds, stats);

    return packs.map((pack, index) => new SelectOption(
      pack.name,
      `/pack/${pack._id.toString()}`,
      packStats[index],
    ));
  }, [packs, packsToLevelIds, stats]);

  return (
    <Page
      folders={[new Folder('/catalog', 'Catalog')]}
      title={title}
    >
      <Select options={getOptions()}/>
    </Page>
  );
}
