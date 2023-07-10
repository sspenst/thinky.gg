import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { Types } from 'mongoose';
import Role from '../constants/role';
import TestId from '../constants/testId';
import Theme from '../constants/theme';
import { generateCollectionSlug, generateLevelSlug } from '../helpers/generateSlug';
import { TimerUtil } from '../helpers/getTs';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import { CampaignModel, CollectionModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';

export default async function initializeLocalDb() {
  const ts = TimerUtil.getTs() - 60;

  // USER
  const promises = [];

  promises.push(UserModel.create({
    _id: new Types.ObjectId(TestId.USER),
    calc_records: 2,
    email: 'test@gmail.com',
    last_visited_at: ts,
    name: 'test',
    password: 'test1234',
    score: 2,
    ts: ts,
  }));

  promises.push(UserConfigModel.create({
    _id: new Types.ObjectId(),
    theme: Theme.Modern,
    userId: new Types.ObjectId(TestId.USER),
    emailConfirmed: true,
  }));

  // USER_B
  promises.push(UserModel.create({
    _id: new Types.ObjectId(TestId.USER_B),
    calc_records: 0,
    email: 'bbb@gmail.com',
    name: 'BBB',
    password: 'BBB12345',
    score: 0,
    ts: ts,
  }));
  promises.push(UserConfigModel.create({
    _id: new Types.ObjectId(),
    theme: Theme.Modern,
    userId: new Types.ObjectId(TestId.USER_B),
    emailConfirmed: true,
  }));

  // USER_C
  // no UserConfig - should only possible for legacy accounts
  promises.push(UserModel.create({
    _id: new Types.ObjectId(TestId.USER_C),
    calc_records: 1,
    email: 'the_curator@gmail.com',
    name: 'Curator',
    password: 'Curator1',
    roles: [Role.CURATOR],
    score: 1,
    ts: ts,
  }));

  promises.push(UserModel.create({
    _id: new Types.ObjectId(TestId.USER_D),
    calc_records: 1,
    email: 'someolduser@someolduser.com',
    name: 'AncientUser',
    password: 'ancient1',
    roles: [],
    score: 1,
    // no ts
  }));

  // user guest
  promises.push(UserModel.create({
    _id: new Types.ObjectId(TestId.USER_GUEST),
    calc_records: 0,
    email: 'guest@guest.com',
    name: 'BBB',
    password: 'BBB12345',
    score: 0,
    roles: [Role.GUEST],
    ts: ts,
  }));
  promises.push(UserConfigModel.create({
    _id: new Types.ObjectId(),
    theme: Theme.Modern,
    userId: new Types.ObjectId(TestId.USER_GUEST),
    emailConfirmed: false,
  }));
  // LEVEL
  promises.push(LevelModel.create({
    _id: new Types.ObjectId(TestId.LEVEL),
    authorNote: 'test level 1 author note',
    data: '4000B0\n120000\n050000\n678900\nABCD30',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'test level 1',
    slug: 'test/test-level-1',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
    width: 6,
  }));
  promises.push(RecordModel.create({
    _id: new Types.ObjectId(TestId.RECORD),
    levelId: new Types.ObjectId(TestId.LEVEL),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(StatModel.create({
    _id: new Types.ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new Types.ObjectId(TestId.LEVEL),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(StatModel.create({
    _id: new Types.ObjectId(),
    attempts: 1,
    complete: false,
    levelId: new Types.ObjectId(TestId.LEVEL),
    moves: 22,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER_B),
  }));

  // LEVEL_2
  promises.push(LevelModel.create({
    _id: new Types.ObjectId(TestId.LEVEL_2),
    data: '40000\n12000\n05000\n67890\nABC03',
    height: 5,
    isDraft: true,
    leastMoves: 20,
    name: 'test level 2',
    slug: 'test/test-level-2',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
    width: 5,
  }));

  // LEVEL_3
  promises.push(LevelModel.create({
    _id: new Types.ObjectId(TestId.LEVEL_3),
    data: '40\n03',
    height: 2,
    isDraft: false,
    leastMoves: 80,
    name: 'x',
    slug: 'test/x',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
    width: 2,
  }));
  promises.push(RecordModel.create({
    _id: new Types.ObjectId(),
    levelId: new Types.ObjectId(TestId.LEVEL_3),
    moves: 80,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(StatModel.create({
    _id: new Types.ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new Types.ObjectId(TestId.LEVEL_3),
    moves: 80,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));

  // LEVEL_4
  promises.push(LevelModel.create({
    _id: new Types.ObjectId(TestId.LEVEL_4),
    data: '40000\n02000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    leastMoves: 20,
    name: 'y',
    slug: 'bbb/y',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER_B),
    width: 5,
  }));
  promises.push(RecordModel.create({
    _id: new Types.ObjectId(),
    levelId: new Types.ObjectId(TestId.LEVEL_4),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER_B),
  }));
  promises.push(StatModel.create({
    _id: new Types.ObjectId(),
    attempts: 1,
    complete: true,
    levelId: new Types.ObjectId(TestId.LEVEL_4),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER_B),
  }));

  // DELETED DOCUMENTS
  promises.push(LevelModel.create({
    _id: new Types.ObjectId(TestId.LEVEL_DELETED),
    authorNote: 'test level deleted author note',
    data: '4000B0\n120000\n050000\n678900\nABCD30',
    height: 5,
    isDeleted: true,
    isDraft: false,
    leastMoves: 20,
    name: 'test level deleted',
    slug: TestId.LEVEL_DELETED,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
    width: 6,
  }));
  promises.push(PlayAttemptModel.create({
    _id: new Types.ObjectId(),
    attemptContext: AttemptContext.UNBEATEN,
    endTime: 200,
    isDeleted: true,
    levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
    startTime: 100,
    updateCount: 1,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(RecordModel.create({
    _id: new Types.ObjectId(),
    isDeleted: true,
    levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(ReviewModel.create({
    _id: new Types.ObjectId(),
    isDeleted: true,
    levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));
  promises.push(StatModel.create({
    _id: new Types.ObjectId(),
    attempts: 1,
    complete: true,
    isDeleted: true,
    levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
    moves: 20,
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));

  promises.push(CollectionModel.create({
    _id: new Types.ObjectId(TestId.COLLECTION),
    authorNote: 'test collection author note',
    name: 'test collection',
    slug: await generateCollectionSlug('test', 'test collection'),
    userId: new Types.ObjectId(TestId.USER),
    levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2)]
  }));

  promises.push(CollectionModel.create({
    _id: new Types.ObjectId(TestId.COLLECTION_2),
    levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
    name: 'test collection 2',
    slug: await generateCollectionSlug('test', 'test collection 2'),
    userId: new Types.ObjectId(TestId.USER),
  }));

  promises.push(CollectionModel.create({
    _id: new Types.ObjectId(TestId.COLLECTION_B),
    levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
    name: 'test collection 3',
    slug: await generateCollectionSlug('BBB', 'test collection 3'),
    userId: new Types.ObjectId(TestId.USER_B),
  }));

  promises.push(CampaignModel.create({
    _id: new Types.ObjectId(TestId.CAMPAIGN_OFFICIAL),
    authorNote: 'The official campaign!',
    collections: [new Types.ObjectId(TestId.COLLECTION)],
    name: 'Official Campaign',
    slug: 'official-campaign',
  }));

  promises.push(ReviewModel.create({
    _id: new Types.ObjectId(TestId.REVIEW),
    levelId: new Types.ObjectId(TestId.LEVEL),
    score: 5,
    text: 'My best creation. I can\'t really imagine anything better.',
    ts: ts,
    userId: new Types.ObjectId(TestId.USER),
  }));

  await Promise.all(promises);
}

export async function initLevel(userId: string, name: string, obj: Partial<Level> = {}, createReviews = true) {
  const ts = TimerUtil.getTs();
  const id = new Types.ObjectId();
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

  if (createReviews) {
    for (let i = 0; i < name.length; i++) {
      await ReviewModel.create({
        _id: new Types.ObjectId(),
        levelId: id,
        score: (3903 * i * i + 33 * i) % 5 + 1,
        text: 'Game is OK',
        ts: ts - i * 20,
        userId: new Types.ObjectId(),
      });
    }
  }

  return lvl;
}

export async function initCollection(userId: string, name: string, obj: Partial<Collection> = {}) {
  const id = new Types.ObjectId();
  const collection = await CollectionModel.create({
    _id: id,
    authorNote: 'test collection ' + name + ' author note',
    name: name,
    userId: userId,
    slug: await generateCollectionSlug('test', name),
    ...obj }) as Collection;

  return collection;
}
