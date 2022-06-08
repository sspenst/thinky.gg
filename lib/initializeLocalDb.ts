import { LevelModel, RecordModel, ReviewModel, UserModel, WorldModel } from '../models/mongoose';

import Level from '../models/db/level';
import { ObjectId } from 'bson';
import User from '../models/db/user';
import getTs from '../helpers/getTs';

export default async function initializeLocalDb() {
  const ts = getTs();

  const user: User = await UserModel.create({
    _id: new ObjectId('600000000000000000000000'),
    email: 'test@gmail.com',
    isOfficial: false,
    name: 'test',
    password: 'test',
    score: 0,
    ts: ts,
  });

  await UserModel.create({
    _id: new ObjectId('600000000000000000000006'),
    email: 'bbb@gmail.com',
    isOfficial: false,
    name: 'BBB',
    password: 'BBB',
    score: 0,
    ts: ts,
  });

  const level: Level = await LevelModel.create({
    _id: new ObjectId('600000000000000000000002'),
    authorNote: 'test level 1 author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'test level 1',
    points: 0,
    ts: ts,
    userId: user._id,
    width: 5,
  });
  const level2_draft: Level = await LevelModel.create({
    _id: new ObjectId('600000000000000000000003'),
    data: '40000\n12000\n05000\n67890\nABC03',
    height: 5,
    isDraft: true,
    leastMoves: 20,
    name: 'test level 2',
    points: 0,
    ts: ts,
    userId: user._id,
    width: 5,
  });

  await WorldModel.create({
    _id: new ObjectId('600000000000000000000001'),
    authorNote: 'test world author note',
    name: 'test world',
    userId: user._id,
    levels: [level._id, level2_draft._id]
  });
  await WorldModel.create({
    _id: new ObjectId('600000000000000000000004'),
    levels: [level._id, level2_draft._id],
    name: 'test world 2',
    userId: user._id,
  });

  await RecordModel.create({
    _id: new ObjectId('600000000000000000000005'),
    levelId: level._id,
    moves: 20,
    ts: ts,
    userId: user._id,
  });

  await ReviewModel.create({
    _id: new ObjectId(),
    levelId: level._id,
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: user._id,
  });

  const officialUser: User = await UserModel.create({
    _id: new ObjectId('610000000000000000000000'),
    email: 'official@gmail.com',
    isOfficial: true,
    name: 'Official',
    password: 'official',
    score: 0,
    ts: ts,
  });

  await WorldModel.create({
    _id: new ObjectId('610000000000000000000001'),
    name: 'The Official Test Levels',
    levels: [level._id],
    userId: officialUser._id,
  });
}
export async function initLevel(userId:string, name:string) {
  const ts = getTs();

  return await LevelModel.create({
    _id: new ObjectId(),
    authorNote: 'test level 1 author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: name,
    points: 0,
    ts: ts,
    userId: userId,
    width: 5,
  });
}
