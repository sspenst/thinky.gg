import mongoose from 'mongoose';
import TestId from '../constants/testId';
import dbConnect, { dbDisconnect } from '../lib/dbConnect';
import { UserModel } from '../models/mongoose';

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

async function doA(session?: mongoose.ClientSession) {
  return await UserModel.updateOne({
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
  return await UserModel.updateOne({
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

describe('Testing db transactions behaviors', () => {
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
    }
    catch (err){
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
});
