import { LevelModel, RecordModel, UserModel, WorldModel } from '../models/mongoose';
import Level from '../models/db/level';
import { ObjectId } from 'bson';
import User from '../models/db/user';
import World from '../models/db/world';
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
  
  const world: World = await WorldModel.create({
    _id: new ObjectId('600000000000000000000001'),
    authorNote: 'test world author note',
    name: 'test world',
    userId: user._id,
  });

  const level: Level = await LevelModel.create({
    _id: new ObjectId('600000000000000000000002'),
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    leastMoves: 20,
    name: 'test level 1',
    points: 0,
    ts: ts,
    userId: user._id,
    width: 5,
    worldId: world._id,
  });

  const level2: Level = await LevelModel.create({
    _id: new ObjectId('600000000000000000000003'),
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    leastMoves: 20,
    name: 'test level 2',
    points: 0,
    ts: ts,
    userId: user._id,
    width: 5,
  });

  await WorldModel.create({
    _id: new ObjectId('600000000000000000000004'),
    authorNote: 'test world author note',
    levels: [level, level2],
    name: 'test world',
    userId: user._id,
  });

  await RecordModel.create({
    _id: new ObjectId('600000000000000000000003'),
    levelId: level._id,
    moves: 20,
    ts: ts,
    userId: user._id,
  });
}
