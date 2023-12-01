import { EmailDigestSettingTypes } from '@root/constants/emailDigest';
import { AttemptContext } from '@root/models/schemas/playAttemptSchema';
import { PASSWORD_SALTROUNDS } from '@root/models/schemas/userSchema';
import { getNewUserConfig } from '@root/pages/api/user-config';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { GameId } from '../constants/GameId';
import Role from '../constants/role';
import TestId from '../constants/testId';
import { generateCollectionSlug, generateLevelSlug } from '../helpers/generateSlug';
import { TimerUtil } from '../helpers/getTs';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import { CampaignModel, CollectionModel, LevelModel, PlayAttemptModel, RecordModel, ReviewModel, StatModel, UserConfigModel, UserModel } from '../models/mongoose';

export default async function initializeLocalDb() {
  const ts = TimerUtil.getTs() - 60;

  // USER
  const promises = [];

  // Note - UserModel has to use create, not insertMany, because of the pre-save hook for the password
  promises.push(UserModel.insertMany([
    {
      _id: new Types.ObjectId(TestId.USER),
      calc_records: 2,
      email: 'test@gmail.com',
      last_visited_at: ts,
      name: 'test',
      password: await bcrypt.hash('test1234', PASSWORD_SALTROUNDS),
      score: 2,
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_B),
      calc_records: 0,
      email: 'bbb@gmail.com',
      name: 'BBB',
      password: await bcrypt.hash('BBB12345', PASSWORD_SALTROUNDS),
      score: 0,
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_C),
      calc_records: 1,
      email: 'the_curator@gmail.com',
      name: 'Curator',
      password: await bcrypt.hash('Curator1', PASSWORD_SALTROUNDS),
      roles: [Role.CURATOR],
      score: 1,
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_D),
      calc_records: 1,
      email: 'someolduser@someolduser.com',
      name: 'AncientUser',
      password: await bcrypt.hash('ancient1', PASSWORD_SALTROUNDS),
      roles: [],
      score: 1,
      // no ts
    },
    {
      _id: new Types.ObjectId(TestId.USER_GUEST),
      calc_records: 0,
      email: 'guest@guest.com',
      name: 'guest',
      password: await bcrypt.hash('BBB12345', PASSWORD_SALTROUNDS),
      score: 0,
      roles: [Role.GUEST],
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_PRO),
      calc_records: 1,
      email: 'pro@pro.com',
      name: 'Pro',
      password: await bcrypt.hash('pro', PASSWORD_SALTROUNDS),
      roles: [Role.PRO],
      score: 0,
      ts: ts,
    },
    {
      _id: new Types.ObjectId(TestId.USER_ADMIN),
      calc_records: 1,
      email: 'admin@admin.com',
      name: 'Admin',
      password: await bcrypt.hash('admin', PASSWORD_SALTROUNDS),
      roles: [Role.ADMIN],
      score: 0,
      ts: ts,
    },
  ],
  { ordered: false }
  ));

  promises.push(UserConfigModel.insertMany([
    getNewUserConfig(GameId.PATHOLOGY, [], 0, new Types.ObjectId(TestId.USER), { emailConfirmed: true }),
    getNewUserConfig(GameId.PATHOLOGY, [], 0, new Types.ObjectId(TestId.USER_B), { emailConfirmed: true }),
    getNewUserConfig(GameId.PATHOLOGY, [Role.GUEST], 0, new Types.ObjectId(TestId.USER_GUEST)),
    getNewUserConfig(GameId.PATHOLOGY, [Role.PRO], 0, new Types.ObjectId(TestId.USER_PRO), { emailConfirmed: true, emailDigest: EmailDigestSettingTypes.NONE }),
  ], { ordered: false }));

  // LEVEL
  promises.push(LevelModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.LEVEL),
        authorNote: 'test level 1 author note',
        data: '4000B0\n120000\n050000\n678900\nABCD30',
        height: 5,
        gameId: GameId.PATHOLOGY,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'test level 1',
        slug: 'test/test-level-1',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 6,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_2),
        data: '40000\n12000\n05000\n67890\nABC03',
        height: 5,
        gameId: GameId.PATHOLOGY,
        isDraft: true,
        isRanked: false,
        leastMoves: 20,
        name: 'test level 2',
        slug: 'test/test-level-2',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 5,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_3),
        data: '40\n03',
        height: 2,
        gameId: GameId.PATHOLOGY,
        isDraft: false,
        isRanked: false,
        leastMoves: 80,
        name: 'x',
        slug: 'test/x',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 2,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_4),
        data: '40000\n02000\n05000\n67890\nABCD3',
        height: 5,
        gameId: GameId.PATHOLOGY,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'y',
        slug: 'bbb/y',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
        width: 5,
      },
      {
        _id: new Types.ObjectId(TestId.LEVEL_DELETED),
        authorNote: 'test level deleted author note',
        data: '4000B0\n120000\n050000\n678900\nABCD30',
        height: 5,
        gameId: GameId.PATHOLOGY,
        isDeleted: true,
        isDraft: false,
        isRanked: false,
        leastMoves: 20,
        name: 'test level deleted',
        slug: TestId.LEVEL_DELETED,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
        width: 6,
      }
    ],
    { ordered: false }
  ));
  promises.push(RecordModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.RECORD),
        levelId: new Types.ObjectId(TestId.LEVEL),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        gameId: GameId.PATHOLOGY,
        moves: 80,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      }
    ],
    {
      ordered: false
    }
  ));
  promises.push(StatModel.insertMany(
    [
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        levelId: new Types.ObjectId(TestId.LEVEL),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: false,
        levelId: new Types.ObjectId(TestId.LEVEL),
        gameId: GameId.PATHOLOGY,
        moves: 22,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        levelId: new Types.ObjectId(TestId.LEVEL_3),
        gameId: GameId.PATHOLOGY,
        moves: 80,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        levelId: new Types.ObjectId(TestId.LEVEL_4),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(),
        attempts: 1,
        complete: true,
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        gameId: GameId.PATHOLOGY,
        moves: 20,
        ts: ts,
        userId: new Types.ObjectId(TestId.USER),
      }
    ],
    {
      ordered: false
    }
  ));

  // DELETED DOCUMENTS

  promises.push(PlayAttemptModel.insertMany([
    {
      _id: new Types.ObjectId(),
      attemptContext: AttemptContext.UNSOLVED,
      endTime: 200,
      isDeleted: true,
      levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
      gameId: GameId.PATHOLOGY,
      startTime: 100,
      updateCount: 1,
      userId: new Types.ObjectId(TestId.USER),
    }
  ],
  { ordered: false }
  ));

  promises.push(ReviewModel.insertMany(
    [
      {
        _id: new Types.ObjectId(),
        isDeleted: true,
        levelId: new Types.ObjectId(TestId.LEVEL_DELETED),
        score: 5,
        gameId: GameId.PATHOLOGY,
        text: 'My best creation. I can\'t really imagine anything better.',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      },
      {
        _id: new Types.ObjectId(TestId.REVIEW),
        levelId: new Types.ObjectId(TestId.LEVEL),
        score: 5,
        gameId: GameId.PATHOLOGY,
        text: 'My best creation. I can\'t really imagine anything better.',
        ts: ts,
        userId: new Types.ObjectId(TestId.USER_B),
      }
    ],
    { ordered: false }
  ));

  promises.push(CollectionModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.COLLECTION),
        authorNote: 'test collection author note',
        name: 'test collection',
        gameId: GameId.PATHOLOGY,
        slug: await generateCollectionSlug('test', 'test collection'),
        userId: new Types.ObjectId(TestId.USER),
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2)]
      },
      {
        _id: new Types.ObjectId(TestId.COLLECTION_2),
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
        name: 'test collection 2',
        gameId: GameId.PATHOLOGY,
        slug: await generateCollectionSlug('test', 'test collection 2'),
        userId: new Types.ObjectId(TestId.USER),
      },
      {
        _id: new Types.ObjectId(TestId.COLLECTION_B),
        levels: [new Types.ObjectId(TestId.LEVEL), new Types.ObjectId(TestId.LEVEL_2), new Types.ObjectId(TestId.LEVEL_3)],
        name: 'test collection 3',
        gameId: GameId.PATHOLOGY,
        slug: await generateCollectionSlug('BBB', 'test collection 3'),
        userId: new Types.ObjectId(TestId.USER_B),
      }

    ],
    { ordered: false }
  ));

  promises.push(CampaignModel.insertMany(
    [
      {
        _id: new Types.ObjectId(TestId.CAMPAIGN_OFFICIAL),
        authorNote: 'The official campaign!',
        gameId: GameId.PATHOLOGY,
        collections: [new Types.ObjectId(TestId.COLLECTION)],
        name: 'Official Campaign',
        slug: 'official-campaign',
      }
    ]));

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
    gameId: GameId.PATHOLOGY,
    authorNote: 'test level ' + name + ' author note',
    data: '40000\n12000\n05000\n67890\nABCD3',
    height: 5,
    isDraft: false,
    isRanked: false,
    leastMoves: 20,
    name: name,
    slug: slug,
    ts: ts - name.length * 300,
    userId: userId,
    width: 5,
    ...obj }) as Level;

  if (createReviews) {
    const revs = [];

    for (let i = 0; i < name.length; i++) {
      revs.push({
        _id: new Types.ObjectId(),
        gameId: GameId.PATHOLOGY,
        levelId: id,
        score: (3903 * i * i + 33 * i) % 5 + 1,
        text: 'Game is OK',
        ts: ts - i * 20,
        userId: new Types.ObjectId(),
      });
    }

    await ReviewModel.insertMany(revs);
  }

  return lvl;
}

export async function initCollection(userId: string, name: string, obj: Partial<Collection> = {}) {
  const id = new Types.ObjectId();
  const collection = await CollectionModel.create({
    _id: id,
    gameId: GameId.PATHOLOGY,
    authorNote: 'test collection ' + name + ' author note',
    name: name,
    userId: userId,
    slug: await generateCollectionSlug('test', name),
    ...obj }) as Collection;

  return collection;
}
