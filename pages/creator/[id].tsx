import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import Pack from '../../models/data/pathology/pack';
import Select from '../../components/select';
import LeastMovesHelper from '../../helpers/leastMovesHelper';
import SelectOption from '../../models/selectOption';
import Page from '../../components/page';
import { GetServerSidePropsContext } from 'next';
import { ParsedUrlQuery } from 'querystring';
import Creator from '../../models/data/pathology/creator';

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
  const { id } = context.params as CreatorParams;
  const [creatorsRes, packsRes] = await Promise.all([
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `creators?id=${id}`),
    fetch(process.env.NEXT_PUBLIC_SERVICE_URL + `packs?creatorId=${id}`),
  ]);

  if (!creatorsRes.ok) {
    throw new Error(`${creatorsRes.status} ${creatorsRes.statusText}`);
  }
  
  if (!packsRes.ok) {
    throw new Error(`${packsRes.status} ${packsRes.statusText}`);
  }

  const [creators, packs]: [Creator[], Pack[]] = await Promise.all([
    creatorsRes.json(),
    packsRes.json(),
  ]);
  const title = creators[0].name;

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
  }, [moves, packs]);

  return (
    <Page escapeHref={'/catalog'} title={title}>
      <Select options={getOptions()}/>
    </Page>
  );
}
