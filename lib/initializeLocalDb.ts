import { LevelModel, RecordModel, ReviewModel, UserConfigModel, UserModel, WorldModel } from '../models/mongoose';
import Level from '../models/db/level';
import { ObjectId } from 'bson';
import Theme from '../constants/theme';
import User from '../models/db/user';
import World from '../models/db/world';
import getTs from '../helpers/getTs';

export default async function initializeLocalDb() {
  const ts = getTs();

  const user: User = await UserModel.create({
    _id: new ObjectId('600000000000000000000000'),
    calc_records: 0,
    email: 'test@gmail.com',
    last_visited_at: ts,
    name: 'test',
    password: 'test',
    score: 0,
    ts: ts,
  });

  await UserConfigModel.create({
    _id: new ObjectId(),
    sidebar: true,
    theme: Theme.Modern,
    userId: user._id,
  });

  const userB = await UserModel.create({
    _id: new ObjectId('600000000000000000000006'),
    calc_records: 0,
    email: 'bbb@gmail.com',
    name: 'BBB',
    password: 'BBB',
    score: 0,
    ts: ts,
  });

  await UserConfigModel.create({
    _id: new ObjectId(),
    sidebar: true,
    theme: Theme.Modern,
    userId: userB._id,
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

  await WorldModel.create({
    _id: new ObjectId('610000000000000000000001'),
    name: 'The Official Test Levels',
    levels: [level._id],
  });
}

export async function initLevel(userId: string, name: string, obj: Partial<Level> = {}) {
  const ts = getTs();
  const id = new ObjectId();

  // based on name length create that many reviews
  const lvl = await LevelModel.create({
    _id: id,
    authorNote: 'test level ' + name + ' author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: name,
    points: 0,
    ts: ts - name.length * 300,
    userId: userId,
    width: 5,
    ...obj }) as Level;

  for (let i = 0; i < name.length; i++) {
    await ReviewModel.create({
      _id: new ObjectId(),
      levelId: id,
      score: (3903 * i * i + 33 * i) % 5 + 1,
      text: 'Game is OK',
      ts: ts - i * 20,
      userId: new ObjectId(),
    });
  }

  return lvl;
}

export async function initWorld(userId: string, name: string, obj: Partial<World> = {}) {
  const id = new ObjectId();
  const world = await WorldModel.create({
    _id: id,
    authorNote: 'test world ' + name + ' author note',
    name: name,
    userId: userId,
    ...obj }) as World;

  return world;
}
