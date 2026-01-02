import FormattedReview from '@root/components/level/reviews/formattedReview';
import MultiSelectUser from '@root/components/page/multiSelectUser';
import Page from '@root/components/page/page';
import SpaceBackground from '@root/components/page/SpaceBackground';
import { GameId } from '@root/constants/GameId';
import { getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { getReviewsByUserId, getReviewsByUserIdCount } from '@root/helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '@root/helpers/getReviewsForUserId';
import { getUserFromToken } from '@root/lib/withAuth';
import { ReviewWithStats } from '@root/models/db/review';
import User from '@root/models/db/user';
import { UserModel } from '@root/models/mongoose';
import { GetServerSidePropsContext, NextApiRequest } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

type ReviewType = 'by' | 'for';

interface ReviewsPageProps {
  reviews: ReviewWithStats[];
  reviewsCount: number;
  page: number;
  filterUser?: User;
  reviewType: ReviewType;
  reqUser: User | null;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const gameIdFromReq = getGameIdFromReq(context.req);
  const gameId = gameIdFromReq !== GameId.THINKY ? gameIdFromReq : undefined;
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  const page = parseInt(context.query.page as string) || 1;
  const userName = context.query.user as string | undefined;
  const reviewType = (context.query.type as ReviewType) || 'by';

  let filterUser: User | null = null;

  // Get filter user info if provided
  if (userName) {
    filterUser = await UserModel.findOne({ name: userName }).lean<User>();
  }

  // Only fetch reviews if a filter is applied
  let reviews: ReviewWithStats[] = [];
  let reviewsCount = 0;

  if (filterUser) {
    if (reviewType === 'for') {
      [reviews, reviewsCount] = await Promise.all([
        getReviewsForUserId(gameId, filterUser._id.toString(), reqUser, { limit: 10, skip: 10 * (page - 1) }),
        getReviewsForUserIdCount(gameId, filterUser._id.toString()),
      ]);
    } else {
      [reviews, reviewsCount] = await Promise.all([
        getReviewsByUserId(gameId, filterUser._id.toString(), reqUser, { limit: 10, skip: 10 * (page - 1) }),
        getReviewsByUserIdCount(gameId, filterUser._id.toString()),
      ]);
    }
  }

  return {
    props: {
      reviews: JSON.parse(JSON.stringify(reviews)),
      reviewsCount,
      page,
      filterUser: filterUser ? JSON.parse(JSON.stringify(filterUser)) : null,
      reviewType,
      reqUser: reqUser ? JSON.parse(JSON.stringify(reqUser)) : null,
    },
  };
}

export default function ReviewsPage({
  reviews,
  reviewsCount,
  page,
  filterUser,
  reviewType: initialReviewType,
}: ReviewsPageProps) {
  const router = useRouter();
  const [reviewType, setReviewType] = useState<ReviewType>(initialReviewType);

  useEffect(() => {
    setReviewType(initialReviewType);
  }, [initialReviewType]);

  const buildUrl = (newPage?: number, newUserSlug?: string, newType?: ReviewType) => {
    const params = new URLSearchParams();

    const userSlug = newUserSlug !== undefined ? newUserSlug : (router.query.user as string);
    const type = newType !== undefined ? newType : reviewType;

    if (userSlug) params.set('user', userSlug);
    if (type) params.set('type', type);
    if (newPage && newPage > 1) params.set('page', newPage.toString());

    return `/reviews${params.toString() ? `?${params.toString()}` : ''}`;
  };

  return (
    <Page title='Reviews'>
      <SpaceBackground
        starCount={60}
        constellationPattern='default'
        showGeometricShapes={true}
        className='min-h-0'
      >
        <div className='flex flex-col items-center min-h-screen px-4 py-8'>
          <div className='text-center mb-8 animate-fadeInDown' style={{ animationDelay: '0.1s' }}>
            <h1 className='text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-cyan-400 mb-4'>
              Reviews
            </h1>
            <p className='text-gray-300 text-lg max-w-2xl mx-auto'>
              {filterUser
                ? reviewType === 'by'
                  ? `Reviews written by ${filterUser.name}`
                  : `Reviews on levels by ${filterUser.name}`
                : 'Select a user to browse reviews'}
            </p>
          </div>

          <div className='w-full max-w-4xl mb-6 space-y-6 animate-fadeInUp' style={{ animationDelay: '0.2s' }}>
            <div className='bg-white/10 border border-white/20 rounded-xl p-4'>
              <div className='flex flex-col gap-4'>
                <div className='flex-1'>
                  <label className='block text-sm font-medium text-gray-300 mb-2'>
                    Select User
                  </label>
                  <MultiSelectUser
                    key={'user-' + filterUser?._id?.toString()}
                    placeholder='Search for user...'
                    defaultValue={filterUser}
                    onSelect={(selectedUser: User) => {
                      if (selectedUser) {
                        router.push(buildUrl(1, selectedUser.name.toLowerCase(), reviewType));
                      } else {
                        router.push('/reviews');
                      }
                    }}
                  />
                </div>

                {filterUser && (
                  <div className='flex flex-col gap-3'>
                    <label className='block text-sm font-medium text-gray-300'>
                      Show Reviews
                    </label>
                    <div className='flex gap-2'>
                      <button
                        onClick={() => {
                          router.push(buildUrl(1, filterUser.name.toLowerCase(), 'by'));
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                          reviewType === 'by'
                            ? 'bg-purple-500/50 text-white border-2 border-purple-400'
                            : 'bg-white/10 text-gray-300 border-2 border-white/20 hover:bg-white/20'
                        }`}
                      >
                        ✍️ Written by {filterUser.name}
                      </button>
                      <button
                        onClick={() => {
                          router.push(buildUrl(1, filterUser.name.toLowerCase(), 'for'));
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                          reviewType === 'for'
                            ? 'bg-blue-500/50 text-white border-2 border-blue-400'
                            : 'bg-white/10 text-gray-300 border-2 border-white/20 hover:bg-white/20'
                        }`}
                      >
                        💌 On {filterUser.name}&apos;s levels
                      </button>
                    </div>
                  </div>
                )}

                {filterUser && (
                  <div className='flex justify-end'>
                    <Link
                      href='/reviews'
                      className='text-sm text-gray-300 hover:text-white underline transition-colors'
                    >
                      Clear filter
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {!filterUser ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>🔍</div>
                <div className='text-xl text-gray-300'>Select a user to view reviews</div>
                <div className='text-gray-400 mt-2'>Choose a user and toggle between reviews they wrote or reviews on their levels</div>
              </div>
            ) : reviewsCount === 0 ? (
              <div className='text-center py-12'>
                <div className='text-6xl mb-4'>📝</div>
                <div className='text-xl text-gray-300'>No reviews found!</div>
                <div className='text-gray-400 mt-2'>Try adjusting your filters</div>
              </div>
            ) : (
              reviews?.map((review, index) => {
                const userForReview = reviewType === 'by' ? filterUser : review.userId;

                if (!userForReview?._id) {
                  return null;
                }

                return (
                  <div
                    className='animate-fadeInUp'
                    key={`review-${review._id}`}
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    <FormattedReview
                      level={review.levelId}
                      review={review}
                      user={userForReview}
                    />
                  </div>
                );
              })
            )}

            {/* Pagination */}
            {reviewsCount > 10 && filterUser && (
              <div className='flex justify-center gap-4 mt-8 animate-fadeInUp' style={{ animationDelay: '0.9s' }}>
                {page > 1 && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={buildUrl(page - 1)}
                  >
                    ← Previous
                  </Link>
                )}
                <div className='bg-black/20 backdrop-blur-xs border border-white/20 rounded-lg px-4 py-2 text-white font-medium'>
                  {page} of {Math.ceil(reviewsCount / 10)}
                </div>
                {reviewsCount > page * 10 && (
                  <Link
                    className='bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300'
                    href={buildUrl(page + 1)}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </SpaceBackground>
    </Page>
  );
}
