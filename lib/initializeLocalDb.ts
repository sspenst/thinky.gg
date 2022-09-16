import { ObjectId } from 'bson';
import TestId from '../constants/testId';
import Theme from '../constants/theme';
import { generateCollectionSlug, generateLevelSlug } from '../helpers/generateSlug';
import { TimerUtil } from '../helpers/getTs';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import { CampaignModel, CollectionModel, LevelModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';

export default async function initializeLocalDb() {
  const ts = TimerUtil.getTs();

  await UserModel.create({
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
    userId: new ObjectId(TestId.USER),
  });

  await UserModel.create({
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
    userId: new ObjectId(TestId.USER_B),
  });

  await LevelModel.create({
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
    userId: new ObjectId(TestId.USER),
    width: 5,
  });

  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_2),
    data: '40000\n12000\n05000\n67890\nABC03',
    height: 5,
    isDraft: true,
    leastMoves: 20,
    name: 'test level 2',
    points: 0,
    slug: 'test/test-level-2',
    ts: ts,
    userId: new ObjectId(TestId.USER),
    width: 5,
  });

  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_3),
    data: '40\n03',
    height: 2,
    isDraft: false,
    leastMoves: 80,
    name: 'x',
    points: 1,
    slug: 'test/x',
    ts: ts,
    userId: new ObjectId(TestId.USER),
    width: 2,
  });
  const collection1Slug = await generateCollectionSlug('test', 'test collection');

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION),
    authorNote: 'test collection author note',
    name: 'test collection',
    slug: collection1Slug,
    userId: new ObjectId(TestId.USER),
    levels: [new ObjectId(TestId.LEVEL), new ObjectId(TestId.LEVEL_2)]
  });
  const collection2Slug = await generateCollectionSlug('test', 'test collection 2');

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_2),
    levels: [new ObjectId(TestId.LEVEL), new ObjectId(TestId.LEVEL_2), new ObjectId(TestId.LEVEL_3)],
    name: 'test collection 2',
    slug: collection2Slug,
    userId: new ObjectId(TestId.USER),
  });

  await RecordModel.create({
    _id: new ObjectId(TestId.RECORD),
    levelId: new ObjectId(TestId.LEVEL),
    moves: 20,
    ts: ts,
    userId: new ObjectId(TestId.USER),
  });

  await ReviewModel.create({
    _id: new ObjectId(TestId.REVIEW),
    levelId: new ObjectId(TestId.LEVEL),
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: new ObjectId(TestId.USER),
  });
  const collection3Slug = await generateCollectionSlug('pathology', 'The Official Test Levels');

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_OFFICIAL),
    name: 'Official Collection',
    slug: collection3Slug,
    levels: [new ObjectId(TestId.LEVEL)],
  });

  await StatModel.create({
    _id: new ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new ObjectId(TestId.LEVEL_3),
    moves: 80,
    ts: ts,
    userId: new ObjectId(TestId.USER),
  });

  await CampaignModel.create({
    _id: new ObjectId(),
    authorNote: 'The official campaign!',
    collections: [new ObjectId(TestId.COLLECTION_OFFICIAL)],
    name: 'Official Campaign',
    slug: 'official-campaign',
  });
}

export async function initLevel(userId: string, name: string, obj: Partial<Level> = {}) {
  const ts = TimerUtil.getTs();
  const id = new ObjectId();
  const user = await UserModel.findById(userId, 'name');
  const slug = await generateLevelSlug(user.name, name);

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
    slug: await generateCollectionSlug('test', name),
    ...obj }) as Collection;

  return collection;
}
