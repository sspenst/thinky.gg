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

  // USER
  await UserModel.create({
    _id: new ObjectId(TestId.USER),
    calc_records: 2,
    email: 'test@gmail.com',
    last_visited_at: ts,
    name: 'test',
    password: 'test',
    score: 2,
    ts: ts,
  });
  await UserConfigModel.create({
    _id: new ObjectId(),
    sidebar: true,
    theme: Theme.Modern,
    userId: new ObjectId(TestId.USER),
  });

  // USER_B
  await UserModel.create({
    _id: new ObjectId(TestId.USER_B),
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
    userId: new ObjectId(TestId.USER_B),
  });

  // USER_C
  // no UserConfig - should only possible for legacy accounts
  await UserModel.create({
    _id: new ObjectId(TestId.USER_C),
    calc_records: 1,
    email: 'the_curator@gmail.com',
    name: 'Curator',
    password: 'Curator',
    roles: ['Curator'],
    score: 1,
    ts: ts,
  });

  // LEVEL
  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL),
    authorNote: 'test level 1 author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'test level 1',
    slug: 'test/test-level-1',
    ts: ts,
    userId: new ObjectId(TestId.USER),
    width: 5,
  });
  await RecordModel.create({
    _id: new ObjectId(TestId.RECORD),
    levelId: new ObjectId(TestId.LEVEL),
    moves: 20,
    ts: ts,
    userId: new ObjectId(TestId.USER),
  });
  await StatModel.create({
    _id: new ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new ObjectId(TestId.LEVEL),
    moves: 20,
    ts: ts,
    userId: new ObjectId(TestId.USER),
  });

  // LEVEL_2
  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_2),
    data: '40000\n12000\n05000\n67890\nABC03',
    height: 5,
    isDraft: true,
    leastMoves: 20,
    name: 'test level 2',
    slug: 'test/test-level-2',
    ts: ts,
    userId: new ObjectId(TestId.USER),
    width: 5,
  });

  // LEVEL_3
  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_3),
    data: '40\n03',
    height: 2,
    isDraft: false,
    leastMoves: 80,
    name: 'x',
    slug: 'test/x',
    ts: ts,
    userId: new ObjectId(TestId.USER),
    width: 2,
  });
  await RecordModel.create({
    _id: new ObjectId(),
    levelId: new ObjectId(TestId.LEVEL_3),
    moves: 80,
    ts: ts,
    userId: new ObjectId(TestId.USER),
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

  // LEVEL_4
  await LevelModel.create({
    _id: new ObjectId(TestId.LEVEL_4),
    data: '40000\n02000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'y',
    slug: 'bbb/y',
    ts: ts,
    userId: new ObjectId(TestId.USER_B),
    width: 5,
  });
  await RecordModel.create({
    _id: new ObjectId(),
    levelId: new ObjectId(TestId.LEVEL_4),
    moves: 20,
    ts: ts,
    userId: new ObjectId(TestId.USER_B),
  });
  await StatModel.create({
    _id: new ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new ObjectId(TestId.LEVEL_4),
    moves: 20,
    ts: ts,
    userId: new ObjectId(TestId.USER_B),
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION),
    authorNote: 'test collection author note',
    name: 'test collection',
    slug: await generateCollectionSlug('test', 'test collection'),
    userId: new ObjectId(TestId.USER),
    levels: [new ObjectId(TestId.LEVEL), new ObjectId(TestId.LEVEL_2)]
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_2),
    levels: [new ObjectId(TestId.LEVEL), new ObjectId(TestId.LEVEL_2), new ObjectId(TestId.LEVEL_3)],
    name: 'test collection 2',
    slug: await generateCollectionSlug('test', 'test collection 2'),
    userId: new ObjectId(TestId.USER),
  });

  await CollectionModel.create({
    _id: new ObjectId(TestId.COLLECTION_OFFICIAL),
    name: 'Official Collection',
    slug: await generateCollectionSlug('pathology', 'Official Collection'),
    levels: [new ObjectId(TestId.LEVEL)],
  });

  await CampaignModel.create({
    _id: new ObjectId(TestId.CAMPAIGN_OFFICIAL),
    authorNote: 'The official campaign!',
    collections: [new ObjectId(TestId.COLLECTION_OFFICIAL)],
    name: 'Official Campaign',
    slug: 'official-campaign',
  });

  await ReviewModel.create({
    _id: new ObjectId(TestId.REVIEW),
    levelId: new ObjectId(TestId.LEVEL),
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: new ObjectId(TestId.USER),
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
