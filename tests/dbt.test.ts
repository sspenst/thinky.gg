/* istanbul ignore file */

import { GameId } from '@root/constants/GameId';
import mongoose, { Types } from 'mongoose';
import TestId from '../constants/testId';
import { TimerUtil } from '../helpers/getTs';
import dbConnect, { dbDisconnect } from '../lib/dbConnect';
import { QueueMessageModel, StatModel, UserModel } from '../models/mongoose';
import { QueueMessageState, QueueMessageType } from '../models/schemas/queueMessageSchema';

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(async () => {
  await dbDisconnect();
});
beforeAll(async () => {
  await dbConnect();
});
beforeEach(async () => {
  const userTest = await UserModel.findByIdAndUpdate(TestId.USER_D, {
    $set: {
      calc_records: 0,
      name: 'OLD NAME',
    },
  }, {
    new: true,
  });

  expect(userTest.calc_records).toBe(0);
  expect(userTest.name).toBe('OLD NAME');
});

async function doCreateQueueMessage(session?: mongoose.ClientSession) {
  return QueueMessageModel.create(
    [{
      _id: new Types.ObjectId(),
      dedupeKey: TestId.LEVEL,
      type: QueueMessageType.REFRESH_INDEX_CALCULATIONS,
      state: QueueMessageState.PENDING,
      message: JSON.stringify({ levelId: TestId.LEVEL }),
    }], { session: session });
}

async function doCreateStat(session?: mongoose.ClientSession) {
  return StatModel.create([
    {
      _id: new Types.ObjectId(),
      attempts: 1,
      complete: true,
      gameId: GameId.PATHOLOGY,
      levelId: TestId.LEVEL,
      moves: 10,
      ts: TimerUtil.getTs(),
      userId: new Types.ObjectId(TestId.USER_D),
    }
  ],
  {
    session: session,
  });
}

async function doA(session?: mongoose.ClientSession) {
  return UserModel.updateOne({
    _id: TestId.USER_D,
  }, {
    $inc: {
      calc_records: 1,
    },
  },
  {
    session,
  });
}

async function doB(session?: mongoose.ClientSession) {
  return UserModel.updateOne({
    _id: TestId.USER_D,
  }, {
    $set: {
      name: 'NEW NAME',
    },
  },
  {
    session,
  });
}

async function doFail() {
  // return a promise that will fail after 500ms
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('fail'));
    }, 500);
  });
}

describe.skip('Testing db transactions behaviors', () => {
  test('Test db transactions sequential inside withTransaction', async () => {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await doA();
      await doB();
      await doFail();
    }).catch((err) => {
      console.log('error', err);
    });

    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.calc_records).toBe(1);
    expect(userAfter.name).toBe('NEW NAME');
  });
  test('Test db transactions promise.all no session', async () => {
    try {
      await Promise.all([doA(), doB(), doFail()]);
    } catch (err) {
      console.log('error', err);
    }

    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.calc_records).toBe(1);
    expect(userAfter.name).toBe('NEW NAME');
  });
  test('Test db transactions promise.all no session', async () => {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await Promise.all([doA(), doB(), doFail()]);
    }).catch((err) => {
      console.log('error', err);
    });

    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.calc_records).toBe(1);
    expect(userAfter.name).toBe('NEW NAME');
  });
  test('Test db transactions promise.all pass session', async () => {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await Promise.all([doA(session), doB(session), doFail()]);
    }).catch((err) => {
      console.log('error', err);
    });

    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.calc_records).toBe(0);
    expect(userAfter.name).toBe('OLD NAME');
  });
  test('Test db transactions promise.all pass session', async () => {
    const session = await mongoose.startSession();

    const st = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(st).toBeNull();
    const q = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    expect(q).toBeNull();

    try {
      await session.withTransaction(async () => {
        await Promise.all([doA(session), doCreateStat(session), doCreateQueueMessage(session), doFail()]);
      });
    } catch (err) {
      session.endSession();
      console.log('error', err);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const q2 = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    expect(q2).toBeNull();
    const crr = await UserModel.find({ name: 'CRR' });

    expect(crr).toHaveLength(0);
    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.calc_records).toBe(0);
    expect(userAfter.name).toBe('OLD NAME');

    const stf = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(stf).toBeNull();
  });
  test('Test db transactions promise.all mock throw error does NOT work', async () => {
    jest.spyOn(StatModel, 'create').mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    const session = await mongoose.startSession();

    const st = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(st).toBeNull();
    const q = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    expect(q).toBeNull();

    try {
      await session.withTransaction(async () => {
        await Promise.all([doA(session), doCreateQueueMessage(session), doCreateStat(session)]);
      });
    } catch (err) {
      session.endSession();
      console.log('error', err);
    }

    const q2 = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    // if the transaction rollback works correctly this would be null
    expect(q2).toBeDefined();

    await QueueMessageModel.deleteOne({ dedupeKey: TestId.LEVEL });

    const crr = await UserModel.find({ name: 'CRR' });

    expect(crr).toHaveLength(0);
    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.name).toBe('OLD NAME');

    const stf = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(stf).toBeNull();
  });
  test('Test db transactions promise.all mock promise reject does NOT work', async () => {
    // NB: don't have to set a timeout after the transaction because we are using a promise here
    jest.spyOn(StatModel, 'create').mockImplementationOnce(() => Promise.reject(new Error('failed to create')));

    const session = await mongoose.startSession();

    const st = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(st).toBeNull();
    const q = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    expect(q).toBeNull();

    try {
      await session.withTransaction(async () => {
        await Promise.all([doA(session), doCreateQueueMessage(session), doCreateStat(session)]);
      });
    } catch (err) {
      session.endSession();
      console.log('error', err);
    }

    const q2 = await QueueMessageModel.findOne({ dedupeKey: TestId.LEVEL });

    // if the transaction rollback works correctly this would be null
    expect(q2).toBeDefined();
    const crr = await UserModel.find({ name: 'CRR' });

    expect(crr).toHaveLength(0);
    const userAfter = await UserModel.findById(TestId.USER_D);

    expect(userAfter.name).toBe('OLD NAME');

    const stf = await StatModel.findOne({ userId: TestId.USER_D, levelId: TestId.LEVEL });

    expect(stf).toBeNull();
  });
});
