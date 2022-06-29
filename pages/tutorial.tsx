import { LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import React, { useCallback } from 'react';

import Dimensions from '../constants/dimensions';
import FormattedReview from '../components/formattedReview';
import Game from '../components/level/game';
import LatestLevelsTable from '../components/latestLevelsTable';
import Level from '../models/db/level';
import Link from 'next/link';
import { ObjectId } from 'bson';
import Page from '../components/page';
import Review from '../models/db/review';
import { SWRConfig } from 'swr';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import User from '../models/db/user';
import dbConnect from '../lib/dbConnect';
import getSWRKey from '../helpers/getSWRKey';
import getTs from '../helpers/getTs';
import useLatestLevels from '../hooks/useLatestLevels';
import useLatestReviews from '../hooks/useLatestReviews';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  return {
    props: {}
  };

}
export default function App() {

  const level: Level = {
    _id: new ObjectId(),
    authorNote: 'test level 1 author note',
    data: '0000000000\n0040003000\n0000000000\n'.trim(),
    height: 3,
    isDraft: false,
    leastMoves: 20,
    name: 'test level 1',
    points: 0,
    ts: getTs(),
    width: 9,
  };

  return (
    <Page title={'Pathology'}>
      <Game
        level={level}

      />

    </Page>
  );
}
