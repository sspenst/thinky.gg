import { LevelModel, ReviewModel } from '../models/mongoose';
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
import dbConnect from '../lib/dbConnect';
import getSWRKey from '../helpers/getSWRKey';
import useLatestReviews from '../hooks/useLatestReviews';
import useUser from '../hooks/useUser';

export async function getStaticProps() {
  await dbConnect();

  const [levels, reviews] = await Promise.all([
    LevelModel.find<Level>({ isDraft: false })
      .populate('userId', '_id name')
      .sort({ ts: -1 })
      .limit(10),
    ReviewModel.find<Review>()
      .populate('levelId', '_id name')
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
    } as AppProps,
    revalidate: 60 * 60,
  };
}

interface AppSWRProps {
  levels: Level[];
  reviews: Review[];
}

export default function AppSWR({ levels, reviews }: AppSWRProps) {
  return (
    <SWRConfig value={{ fallback: {
      [getSWRKey('/api/latest-reviews')]: reviews,
    } }}>
      <App levels={levels}/>
    </SWRConfig>
  );
}

interface AppProps {
  levels: Level[];
}

function App({ levels }: AppProps) {
  const { isLoading, user } = useUser();
  const { reviews } = useLatestReviews();

  const getOptions = useCallback(() => {
    return [
      new SelectOption('Play', '/catalog'),
      new SelectOption('Create', '/create', undefined, Dimensions.OptionHeight, undefined, undefined, isLoading || !user),
      new SelectOption('Leaderboard', '/leaderboard'),
    ];
  }, [isLoading, user]);

  return (
    <Page title={'Pathology'}>
      <>
        <div
          style={{
            margin: Dimensions.TableMargin,
            textAlign: 'center',
          }}
        >
          {'Welcome to Pathology! If you are a returning Psychopath player feel free to jump in and browse the full catalog of levels, but if you are new to the game the best way to start is with the '}
          <Link href={'/world/61ff23c45125afd1d9c0fc4c'} passHref>
            <a className='font-bold underline'>
              Psychopath Tutorial
            </a>
          </Link>
          {'. If you get stuck or want to discuss anything related to Pathology, join the community on the '}
          <a
            className='font-bold underline'
            href='https://discord.gg/j6RxRdqq4A'
            rel='noreferrer'
            target='_blank'
          >
            k2xl Discord
          </a>
          {'. Have fun!'}
        </div>
        <Select options={getOptions()}/>
        {!levels ? null : <>
          <div
            className='font-bold text-lg'
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            Latest Levels:
          </div>
          <LatestLevelsTable levels={levels} />
          <div
            style={{
              margin: Dimensions.TableMargin,
              textAlign: 'center',
            }}
          >
            <span className='font-bold text-lg'>Latest Reviews:</span>
            {reviews?.map((review, index) => {
              return (
                <div
                  key={index}
                  style={{
                    margin: 20,
                  }}
                >
                  <FormattedReview
                    level={review.levelId}
                    review={review}
                    user={review.userId}
                  />
                </div>
              );
            })}
          </div>
        </>}
      </>
    </Page>
  );
}
