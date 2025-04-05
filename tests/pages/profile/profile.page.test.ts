import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { Logger } from 'winston';
import GraphType from '../../../constants/graphType';
import TestId from '../../../constants/testId';
import { getReviewsByUserId, getReviewsByUserIdCount } from '../../../helpers/getReviewsByUserId';
import { getReviewsForUserId, getReviewsForUserIdCount } from '../../../helpers/getReviewsForUserId';
import { logger } from '../../../helpers/logger';
import { createNewReviewOnYourLevelNotification } from '../../../helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '../../../lib/dbConnect';
import { getTokenCookieValue } from '../../../lib/getTokenCookie';
import { GraphModel, UserModel } from '../../../models/mongoose';
import { getServerSideProps, ProfileTab } from '../../../pages/[subdomain]/profile/[name]/[[...tab]]/index';

beforeAll(async () => {
  await dbConnect();
  const promises = [];

  for (let i = 0; i < 30; i++) {
    promises.push(createNewReviewOnYourLevelNotification(DEFAULT_GAME_ID, new Types.ObjectId(TestId.USER), new Types.ObjectId(TestId.USER_B), new Types.ObjectId(), 'id ' + i));
  }

  await Promise.all(promises);
});
afterAll(async () => {
  await dbDisconnect();
});

const gameId = DEFAULT_GAME_ID;

describe('pages/profile page', () => {
  test('getServerSideProps with no parameters', async () => {
    const context = {
      // TODO: add subdomain
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with params parameters but no values', async () => {
    const context = {
      params: {

      }
    };

    const ret = await getServerSideProps(context as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with params parameters multiple folder structure should 404', async () => {
    const context = {
      params: {
        name: 'test',
        tab: ['reviews-written', 'reviews', 'reviews']
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.notFound).toBe(true);
  });
  test('getServerSideProps with name params parameters', async () => {
    const context = {
      params: {
        name: 'test',
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(1);
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
    expect(ret.props?.followers).toHaveLength(0);
    expect(ret.props?.following).toHaveLength(0);
  });
  test('getServerSideProps collections tab', async () => {
    const context = {
      params: {
        name: 'test',
        tab: [ProfileTab.Collections],
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(1);
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('collections');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps levels tab', async () => {
    const context = {
      params: {
        name: 'test',
        tab: [ProfileTab.Levels],
      },
      query: {
        page: '2',
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(2);
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('levels');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps reviews-received tab', async () => {
    const context = {
      params: {
        name: 'test',
        tab: [ProfileTab.ReviewsReceived],
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(1);
    expect(ret.props?.reviewsReceived).toHaveLength(1);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('reviews-received');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps reviews-written tab', async () => {
    const context = {
      params: {
        name: 'test',
        tab: [ProfileTab.ReviewsWritten],
      }
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(1);
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('reviews-written');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
  });
  test('getServerSideProps after following 2 users', async () => {
    const context = {
      params: {
        name: 'test',
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER)
        }
      },
    };

    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.FOLLOW,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.FOLLOW,
      target: TestId.USER_C,
      targetModel: 'User',
    });

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(1);
    expect(ret.props?.reviewsReceived).toHaveLength(0);
    expect(ret.props?.reviewsWritten).toHaveLength(0);
    expect(ret.props?.profileTab).toBe('');
    expect(ret.props?.reviewsReceivedCount).toBe(1);
    expect(ret.props?.reviewsWrittenCount).toBe(0);
    expect(ret.props?.user._id).toBe(TestId.USER);
    expect(ret.props?.followers).toHaveLength(0);
    expect(ret.props?.following).toHaveLength(2);
  });
  test('getServerSideProps page 2', async () => {
    const context = {
      params: {
        name: 'test',
      },
      query: {
        page: '2',
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    expect(ret.props).toBeDefined();
    expect(ret.props?.pageProp).toBe(2);
  });
  test('getReviewsByUserId with invalid userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const reviews = await getReviewsByUserId(gameId, 'invalid');

    expect(reviews).toEqual([]);
  });
  test('getReviewsByUserIdCount with invalid userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const reviews = await getReviewsByUserIdCount(gameId, 'invalid');

    expect(reviews).toBe(0);
  });
  test('getReviewsForUserId with valid userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const reviews = await getReviewsForUserId(gameId, TestId.USER, await UserModel.findById(TestId.USER_B), { skip: 0, limit: 1 });

    expect(reviews).toHaveLength(1);
  });
  test('getReviewsForUserId with invalid userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const reviews = await getReviewsForUserId(gameId, 'invalid');

    expect(reviews).toEqual([]);
  });
  test('getReviewsForUserIdCount with invalid userId', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => ({} as Logger));

    const reviews = await getReviewsForUserIdCount(gameId, 'invalid');

    expect(reviews).toBe(0);
  });

  // Block functionality tests
  test('getReviewsByUserId should filter out reviews from blocked users', async () => {
    // Create a block relationship
    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.BLOCK,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    // Get reviews with the user who has blocked USER_B
    const reqUser = await UserModel.findById(TestId.USER);
    const reviews = await getReviewsByUserId(gameId, TestId.USER_C, reqUser);

    // Verify no reviews from blocked users are present
    const hasBlockedUserReviews = reviews.some(review =>
      review.userId._id.toString() === TestId.USER_B
    );

    expect(hasBlockedUserReviews).toBe(false);

    // Clean up the block for other tests
    await GraphModel.deleteOne({
      source: TestId.USER,
      target: TestId.USER_B,
      type: GraphType.BLOCK,
    });
  });

  test('getReviewsForUserId should filter out reviews from blocked users', async () => {
    // Create a block relationship
    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.BLOCK,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    // Get reviews with the user who has blocked USER_B
    const reqUser = await UserModel.findById(TestId.USER);
    const reviews = await getReviewsForUserId(gameId, TestId.USER, reqUser);

    // Verify no reviews from blocked users are present
    const hasBlockedUserReviews = reviews.some(review =>
      review.userId._id.toString() === TestId.USER_B
    );

    expect(hasBlockedUserReviews).toBe(false);

    // Clean up the block for other tests
    await GraphModel.deleteOne({
      source: TestId.USER,
      target: TestId.USER_B,
      type: GraphType.BLOCK,
    });
  });

  // Test to verify that profile page SSR correctly filters blocked user reviews
  test('getServerSideProps should filter out reviews from blocked users', async () => {
    // Create a block relationship
    await GraphModel.create({
      source: TestId.USER,
      sourceModel: 'User',
      type: GraphType.BLOCK,
      target: TestId.USER_B,
      targetModel: 'User',
    });

    const context = {
      params: {
        name: 'test',
        tab: [ProfileTab.ReviewsReceived],
      },
      req: {
        cookies: {
          token: getTokenCookieValue(TestId.USER),
        },
      },
    };

    const ret = await getServerSideProps(context as unknown as GetServerSidePropsContext);

    // Test that props are defined
    expect(ret.props).toBeDefined();
    expect(ret.props?.reviewsReceived).toBeDefined();

    // Check if any reviews in the response are from the blocked user
    const reviewsReceived = ret.props?.reviewsReceived || [];
    const hasBlockedUserReviews = reviewsReceived.some(
      (review: any) => review.userId._id.toString() === TestId.USER_B
    );

    expect(hasBlockedUserReviews).toBe(false);

    // Clean up the block for other tests
    await GraphModel.deleteOne({
      source: TestId.USER,
      target: TestId.USER_B,
      type: GraphType.BLOCK,
    });
  });
});
