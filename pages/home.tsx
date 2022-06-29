import { LevelModel, ReviewModel, UserModel } from '../models/mongoose';
import React, { useCallback } from 'react';

import Dimensions from '../constants/dimensions';
import FormattedReview from '../components/formattedReview';
import LatestLevelsTable from '../components/latestLevelsTable';
import Level from '../models/db/level';
import Link from 'next/link';
import Page from '../components/page';
import Review from '../models/db/review';
import { SWRConfig } from 'swr';
import Select from '../components/select';
import SelectOption from '../models/selectOption';
import User from '../models/db/user';
import dbConnect from '../lib/dbConnect';
import getSWRKey from '../helpers/getSWRKey';
import useLatestLevels from '../hooks/useLatestLevels';
import useLatestReviews from '../hooks/useLatestReviews';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  await dbConnect();

  return { props: {} };
}
export default function App() {

  const welcomeMessage = 'Welcome to Pathology';

  return (
    <Page title={'Pathology'}>
      <div className="flex mb-4">
        <div className="w-1/3 h-12">

        </div>
        <div className="w-2/3 h-12">
          <h1>{welcomeMessage}</h1>

        </div>
      </div>

    </Page>
  );
}
