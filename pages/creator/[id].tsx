import { useCallback, useEffect, useState } from 'react';
import Creator from '../../models/data/pathology/creator';
import CreatorModel from '../../models/mongoose/creatorModel';
import { GetServerSidePropsContext } from 'next';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import Pack from '../../models/data/pathology/pack';
import PackModel from '../../models/mongoose/packModel';
import Page from '../../components/page';
import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import Select from '../../components/select';
import SelectOption from '../../models/selectOption';
import dbConnect from '../../lib/dbConnect';

export async function getStaticPaths() {
  return {
    paths: [],
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
    PackModel.find<Pack>({ creatorId: id }),
  ]);

  if (!creator) {
    throw new Error(`Error finding Creator ${id}`);
  }
  
  if (!packs) {
    throw new Error(`Error finding Pack by creatorId ${id})`);
  }

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packIds = packs.map(p => p._id.toString());
  const leastMovesRes = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL +
    `levels/leastmoves?packIds=${packIds.join(',')}`);

  if (!leastMovesRes.ok) {
    throw new Error(`${leastMovesRes.status} ${leastMovesRes.statusText}`);
  }

  const leastMovesObj = await leastMovesRes.json();

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
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + 'moves', {credentials: 'include'})
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
