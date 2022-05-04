import { LevelModel, UserModel, WorldModel } from '../models/mongoose';
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
    isUniverse: true,
    name: 'test',
    password: 'test',
    score: 0,
    ts: ts,
  });
  
  const world: World = await WorldModel.create({
    _id: new ObjectId('600000000000000000000001'),
    name: 'test world',
    userId: user._id,
  });

  await LevelModel.create({
    _id: new ObjectId('600000000000000000000002'),
    data: '4000\n0000\n0000\n0003',
    height: 4,
    leastMoves: 20,
    leastMovesTs: 0,
    leastMovesUserId: user._id,
    name: 'test level',
    points: 0,
    ts: ts,
    userId: user._id,
    width: 4,
    worldId: world._id,
  });
}
