import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import { GetServerSidePropsContext } from 'next';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Pack from '../../models/data/pathology/pack';
import PackModel from '../../models/mongoose/packModel';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import StatsHelper from '../../helpers/statsHelper';
import dbConnect from '../../lib/dbConnect';
import { useCallback } from 'react';
import useUser from '../../components/useUser';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const creators = await CreatorModel.find<Creator>();

  if (!creators) {
    throw new Error('Error finding Creators');
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
    CreatorModel.findById<Creator>(id),
    LevelModel.find<Level>({ creatorId: id }, '_id packId'),
    PackModel.find<Pack>({ creatorId: id }, '_id name'),
  ]);

  if (!creator) {
    throw new Error(`Error finding Creator ${id}`);
  }

  if (!levels) {
    throw new Error('Error finding Levels by packIds');
  }
  
  if (!packs) {
    throw new Error(`Error finding Pack by creatorId ${id})`);
  }

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packsToLevelIds: {[creatorId: string]: string[]} = {};

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const packId = level.packId.toString();

    if (!(packId in packsToLevelIds)) {
      packsToLevelIds[packId] = [];
    }

    packsToLevelIds[packId].push(level._id.toString());
  }

  return {
    props: {
      packs: JSON.parse(JSON.stringify(packs)),
      packsToLevelIds,
      title: creator.name,
    } as CreatorPageProps,
  };
}

interface CreatorPageProps {
  packs: Pack[];
  packsToLevelIds: {[creatorId: string]: string[]};
  title: string;
}

export default function CreatorPage({ packs, packsToLevelIds, title }: CreatorPageProps) {
  const { user } = useUser();

  const getOptions = useCallback(() => {
    if (!packs) {
      return [];
    }

    const stats = StatsHelper.packStats(packs, packsToLevelIds, user);

    return packs.map((pack, index) => new SelectOption(
      pack.name,
      `/pack/${pack._id.toString()}`,
      stats[index],
    ));
  }, [packs, packsToLevelIds, user]);

  return (
    <Page escapeHref={'/catalog'} title={title}>
      <Select options={getOptions()}/>
    </Page>
  );
}
