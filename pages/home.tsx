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

  const [levels, reviews] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false })
      .populate('userId', '_id name')
      .sort({ ts: -1 })
      .limit(10),
    ReviewModel.find<Review>({ 'text': { '$exists': true } })
      .populate('levelId', '_id name slug')
      .populate('userId', '_id name')
      .sort({ ts: -1 })
      .limit(10),
  ]);

  if (!levels) {
    throw new Error('Error finding Levels');
  }

  if (!reviews) {
    throw new Error('Error finding Reviews');
  }

  return {
    props: {
      levels: JSON.parse(JSON.stringify(levels)),
      reviews: JSON.parse(JSON.stringify(reviews)),
    },
    revalidate: 60 * 60,
  };

}
export default function App({ levels, reviews }) {

  const welcomeMessage = 'Pathology';
  const btn_class = 'inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline';
  const latest_levels_component = <LatestLevelsTable levels={levels} />;

  return (
    <Page title={'Pathology'}>

      <div
        className="text-center relative overflow-hidden bg-no-repeat bg-cover rounded-lg"
      >
        <div id='video_background_hero' className='flex justify-center'>
          <video autoPlay loop muted playsInline>
            <source src="https://i.imgur.com/b3BjzDz.mp4" type="video/mp4" />
          </video>
        </div>
        <div
          className="absolute top-0 right-0 bottom-0 left-0 w-full h-full overflow-hidden bg-fixed"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="flex justify-center items-center h-full">
            <div className="text-white">
              <h2 className="font-semibold text-4xl mb-4">Pathology</h2>
              <h4 className="font-semibold text-xl mb-6">Find the way</h4>
              <a
                className="inline-block px-7 py-3 mb-1 border-2 border-gray-200 bg-blue-300 text-black font-bold text-xl leading-snug uppercase rounded hover:bg-black hover:text-white hover:border-2 focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
                href="/tutorial"
                role="button"
                data-mdb-ripple="true"
                data-mdb-ripple-color="light"

              >
                Play
              </a>
            </div>
          </div>
        </div>
      </div>

    </Page>
  );
}
