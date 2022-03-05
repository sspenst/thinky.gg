import { useCallback, useEffect, useState } from 'react';
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
  const [creatorRes, packsRes] = await Promise.all([
    CreatorModel.findById(id),
    PackModel.find({creatorId: id}),
  ]);

  if (!creatorRes) {
    throw new Error(`Error finding Creator ${id}`);
  }
  
  if (!packsRes) {
    throw new Error(`Error finding Pack by creatorId ${id})`);
  }

  const title = creatorRes.toObject().name;

  const packs: Pack[] = packsRes.map(doc => {
    const pack = doc.toObject();
    pack._id = pack._id.toString();
    return pack;
  });

  packs.sort((a: Pack, b: Pack) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  const packIds = packs.map(p => p._id);
  const leastMovesRes = await fetch(process.env.NEXT_PUBLIC_SERVICE_URL +
    `levels/leastmoves?packIds=${packIds.join(',')}`);

  if (!leastMovesRes.ok) {
    throw new Error(`${leastMovesRes.status} ${leastMovesRes.statusText}`);
  }

  const leastMovesObj = await leastMovesRes.json();

  return {
    props: {
      leastMovesObj,
      packs,
      title,
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
      `/pack/${pack._id}`,
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
