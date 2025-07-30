import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import TestId from '@root/constants/testId';
import { TimerUtil } from '@root/helpers/getTs';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { getTokenCookieValue } from '@root/lib/getTokenCookie';
import { LevelModel, QueueMessageModel } from '@root/models/mongoose';
import { QueueMessageState, QueueMessageType } from '@root/models/schemas/queueMessageSchema';
import { enableFetchMocks } from 'jest-fetch-mock';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../../../pages/[subdomain]/edit/[id]';

enableFetchMocks();

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('/edit/[id] page protection', () => {
  test('should redirect scheduled level to drafts page', async () => {
    const testLevelId = new Types.ObjectId();
    const queueMessageId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a scheduled queue message
    await QueueMessageModel.create({
      _id: queueMessageId,
      dedupeKey: `publish-level-${testLevelId.toString()}`,
      message: JSON.stringify({ levelId: testLevelId.toString() }),
      state: QueueMessageState.PENDING,
      type: QueueMessageType.PUBLISH_LEVEL,
      runAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      processingAttempts: 0,
      isProcessing: false,
    });

    // Create a scheduled level
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test scheduled level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Scheduled Level',
      slug: 'test/test-scheduled-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      scheduledQueueMessageId: queueMessageId,
    });

    const mockContext = {
      query: { id: testLevelId.toString() },
      req: {
        cookies: { token: getTokenCookieValue(TestId.USER_PRO) },
        headers: { host: 'pathology.thinky.gg' },
      },
    } as GetServerSidePropsContext;

    const result = await getServerSideProps(mockContext);

    expect(result).toEqual({
      redirect: {
        destination: '/drafts?scheduled=true',
        permanent: false,
      },
    });
  });

  test('should allow editing non-scheduled level', async () => {
    const testLevelId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a regular draft level (not scheduled)
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test regular level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Regular Level',
      slug: 'test/test-regular-level',
      ts: TimerUtil.getTs(),
      userId: testUserId,
      width: 10,
      // No scheduledQueueMessageId
    });

    const mockContext = {
      query: { id: testLevelId.toString() },
      req: {
        cookies: { token: getTokenCookieValue(TestId.USER_PRO) },
        headers: { host: 'pathology.thinky.gg' },
      },
    } as GetServerSidePropsContext;

    const result = await getServerSideProps(mockContext);

    expect(result).toHaveProperty('props');
    expect((result as any).props.level).toBeTruthy();
    expect((result as any).props.level._id).toBe(testLevelId.toString());
  });

  test('should redirect to home for non-existent level', async () => {
    const nonExistentLevelId = new Types.ObjectId();
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    const mockContext = {
      query: { id: nonExistentLevelId.toString() },
      req: {
        cookies: { token: getTokenCookieValue(TestId.USER_PRO) },
        headers: { host: 'pathology.thinky.gg' },
      },
    } as GetServerSidePropsContext;

    const result = await getServerSideProps(mockContext);

    expect(result).toEqual({
      redirect: {
        destination: '/',
        permanent: false,
      },
    });
  });

  test('should redirect to home for level owned by different user', async () => {
    const testLevelId = new Types.ObjectId();
    const differentUserId = new Types.ObjectId(TestId.USER);
    const testUserId = new Types.ObjectId(TestId.USER_PRO);

    // Create a level owned by different user
    await LevelModel.create({
      _id: testLevelId,
      authorNote: 'Test different owner level',
      data: '4000000000\n0000000000\n0000000000\n0000000000\n0000000030',
      gameId: DEFAULT_GAME_ID,
      height: 5,
      isDraft: true,
      isRanked: false,
      leastMoves: 10,
      name: 'Test Different Owner Level',
      slug: 'test/test-different-owner-level',
      ts: TimerUtil.getTs(),
      userId: differentUserId, // Different user owns this level
      width: 10,
    });

    const mockContext = {
      query: { id: testLevelId.toString() },
      req: {
        cookies: { token: getTokenCookieValue(TestId.USER_PRO) },
        headers: { host: 'pathology.thinky.gg' },
      },
    } as GetServerSidePropsContext;

    // Mock getUserFromToken to return different user
    jest.doMock('../../../lib/withAuth', () => ({
      getUserFromToken: jest.fn().mockResolvedValue({
        _id: testUserId, // This user doesn't own the level
        name: 'Test User',
        email: 'test@example.com',
        roles: ['PRO'],
      }),
    }));

    const result = await getServerSideProps(mockContext);

    expect(result).toEqual({
      redirect: {
        destination: '/',
        permanent: false,
      },
    });
  });
});
