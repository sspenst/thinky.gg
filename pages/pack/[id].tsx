import { useCallback, useEffect, useState } from 'react';
import Dimensions from '../../constants/dimensions';
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
import User from '../../models/data/pathology/user';
import dbConnect from '../../lib/dbConnect';

export async function getStaticPaths() {
  if (process.env.LOCAL) {
    return {
      paths: [],
      fallback: true,
    };
  }

  await dbConnect();

  const packs = await PackModel.find<Pack>();

  if (!packs) {
    throw new Error('Error finding Packs');
  }

  return {
    paths: packs.map(pack => {
      return {
        params: {
          id: pack._id.toString()
        }
      };
    }),
    fallback: true,
  };
}

interface PackParams extends ParsedUrlQuery {
  id: string;
}

export async function getStaticProps(context: GetServerSidePropsContext) {
  await dbConnect();

  const { id } = context.params as PackParams;
  const [levels, pack] = await Promise.all([
    LevelModel.find<Level>({ packId: id }, '_id author leastMoves name'),
    PackModel.findById<Pack>(id),
  ]);

  if (!levels) {
    throw new Error(`Error finding Level by packId ${id})`);
  }

  if (!pack) {
    throw new Error(`Error finding Pack ${id}`);
  }

  levels.sort((a: Level, b: Level) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      pack: JSON.parse(JSON.stringify(pack)),
    } as PackPageProps
  };
}

interface PackPageProps {
  levels: Level[];
  pack: Pack;
}

export default function PackPage({ levels, pack }: PackPageProps) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
    .then(async function(res) {
      setUser(await res.json());
    });
  }, []);

  const getOptions = useCallback(() => {
    if (!levels) {
      return [];
    }

    const stats = StatsHelper.levelStats(levels, user);

    return levels.map((level, index) => new SelectOption(
      `/level/${level._id.toString()}`,
      stats[index],
      level.name,
      Dimensions.OptionHeightLarge,
      level.author,
    ));
  }, [levels, user]);

  return (!pack ? null : 
    <Page escapeHref={`/creator/${pack.creatorId}`} title={pack.name}>
      <Select options={getOptions()} prefetch={false}/>
    </Page>
  );
}
