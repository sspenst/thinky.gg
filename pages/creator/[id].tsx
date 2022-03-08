import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import { GetServerSidePropsContext } from 'next';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Level from '../../models/data/pathology/level';
import LevelModel from '../../models/mongoose/levelModel';
import Pack from '../../models/data/pathology/pack';
import PackModel from '../../models/mongoose/packModel';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import dbConnect from '../../lib/dbConnect';

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
  const [creator, packs] = await Promise.all([
    CreatorModel.findById<Creator>(id),
    PackModel.find<Pack>({ creatorId: id }, '_id name'),
  ]);

  if (!creator) {
    throw new Error(`Error finding Creator ${id}`);
  }
  
  if (!packs) {
    throw new Error(`Error finding Pack by creatorId ${id})`);
  }

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const levels = await LevelModel.find<Level>({ packId: { $in: packs.map(p => p._id) }}, '_id leastMoves packId');

  if (!levels) {
    throw new Error('Error finding Levels by packIds');
  }

  const leastMovesObj: {[packId: string]: {[levelId: string]: number}} = {};
  
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const packId = level.packId.toString();

    if (!(packId in leastMovesObj)) {
      leastMovesObj[packId] = {};
    }

    leastMovesObj[packId][level._id.toString()] = level.leastMoves;
  }

  return {
    props: {
      leastMovesObj,
      packs: JSON.parse(JSON.stringify(packs)),
      title: creator.name,
    } as CreatorPageProps,
  };
}

interface CreatorPageProps {
  leastMovesObj: {[packId: string]: {[levelId: string]: number}};
  packs: Pack[];
  title: string;
}

export default function CreatorPage({ leastMovesObj, packs, title }: CreatorPageProps) {
  const [moves, setMoves] = useState<{[levelId: string]: number}>();

  useEffect(() => {
    fetch('/api/moves', { credentials: 'include' })
    .then(async function(res) {
      setMoves(await res.json());
    });
  }, []);

  const getOptions = useCallback(() => {
    if (!packs) {
      return [];
    }

    const stats = LeastMovesHelper.packStats(packs, leastMovesObj, moves);

    return packs.map((pack, index) => new SelectOption(
      `/pack/${pack._id.toString()}`,
      stats[index],
      pack.name,
    ));
  }, [leastMovesObj, moves, packs]);

  return (
    <Page escapeHref={'/catalog'} title={title}>
      <Select options={getOptions()}/>
    </Page>
  );
}
