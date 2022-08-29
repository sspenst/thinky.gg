import { ObjectId } from 'bson';
import TestId from '../constants/testId';
import Theme from '../constants/theme';
import generateSlug from '../helpers/generateSlug';
import { TimerUtil } from '../helpers/getTs';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import User from '../models/db/user';
import { CollectionModel, LevelModel, RecordModel, ReviewModel, UserConfigModel, UserModel } from '../models/mongoose';

export default async function initializeLocalDb() {
  const ts = TimerUtil.getTs();

  const user: User = await UserModel.create({
    _id: new ObjectId(TestId.USER),
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
    _id: new ObjectId(TestId.USER_B),
    calc_records: 0,
    email: 'bbb@gmail.com',
    name: 'BBB',
    password: 'BBB',
    score: 0,
    ts: ts,
  });

  await UserModel.create({
    _id: new ObjectId(TestId.USER_C),
    calc_records: 0,
    email: 'the_curator@gmail.com',
    name: 'Curator',
    password: 'Curator',
    roles: ['Curator'],
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
    _id: new ObjectId(TestId.LEVEL),
    authorNote: 'test level 1 author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'test level 1',
    points: 0,
    slug: 'test/test-level-1',
    ts: ts,
    userId: user._id,
    width: 5,
  });

  const level2_draft: Level = await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_2),
    data: '40000\n12000\n05000\n67890\nABC03',
    height: 5,
    isDraft: true,
    leastMoves: 20,
    name: 'test level 2',
    points: 0,
    slug: 'test/test-level-2',
    ts: ts,
    userId: user._id,
    width: 5,
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION),
    authorNote: 'test collection author note',
    name: 'test collection',
    userId: user._id,
    levels: [level._id, level2_draft._id]
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_2),
    levels: [level._id, level2_draft._id],
    name: 'test collection 2',
    userId: user._id,
  });

  await RecordModel.create({
    _id: new ObjectId(TestId.RECORD),
    levelId: level._id,
    moves: 20,
    ts: ts,
    userId: user._id,
  });

  await ReviewModel.create({
    _id: new ObjectId(TestId.REVIEW),
    levelId: level._id,
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: user._id,
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_OFFICIAL),
    name: 'The Official Test Levels',
    levels: [level._id],
  });
}

export async function initLevel(userId: string, name: string, obj: Partial<Level> = {}) {
  const ts = TimerUtil.getTs();
  const id = new ObjectId();
  const user = await UserModel.findById(userId, 'name');
  const slug = await generateSlug(user.name, name);

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
    slug: slug,
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

export async function initCollection(userId: string, name: string, obj: Partial<Collection> = {}) {
  const id = new ObjectId();
  const collection = await CollectionModel.create({
    _id: id,
    authorNote: 'test collection ' + name + ' author note',
    name: name,
    userId: userId,
    ...obj }) as Collection;

  return collection;
}
