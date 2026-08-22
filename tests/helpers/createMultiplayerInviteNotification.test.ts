import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import TestId from '@root/constants/testId';
import { createMultiplayerInviteNotification } from '@root/helpers/notificationHelper';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel, NotificationModel, QueueMessageModel } from '@root/models/mongoose';
import { Emitter } from '@socket.io/mongo-emitter';
import { Types } from 'mongoose';

const originalMongoEmitter = global.MongoEmitter;
const originalNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  process.env.NODE_ENV = originalNodeEnv;

  if (originalMongoEmitter) {
    global.MongoEmitter = originalMongoEmitter;
  } else {
    Reflect.deleteProperty(global, 'MongoEmitter');
  }

  await Promise.all([
    MultiplayerMatchModel.deleteMany({ matchId: 'live-private-invite' }),
    NotificationModel.deleteMany({ message: 'live-private-invite' }),
    QueueMessageModel.deleteMany({}),
  ]);
});

describe('createMultiplayerInviteNotification', () => {
  test('refreshes the connected invitee private-match list after persisting the invite', async () => {
    const invitedUserId = new Types.ObjectId(TestId.USER_B);
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));

    process.env.NODE_ENV = 'development';
    global.MongoEmitter = { to } as unknown as Emitter;

    await MultiplayerMatchModel.create({
      createdBy: TestId.USER,
      gameId: DEFAULT_GAME_ID,
      matchId: 'live-private-invite',
      matchLog: [],
      players: [TestId.USER],
      private: true,
      state: MultiplayerMatchState.OPEN,
      type: MultiplayerMatchType.RushBullet,
    });

    await createMultiplayerInviteNotification(
      DEFAULT_GAME_ID,
      TestId.USER,
      invitedUserId,
      'live-private-invite',
    );

    await expect(NotificationModel.exists({
      gameId: DEFAULT_GAME_ID,
      message: 'live-private-invite',
      type: NotificationType.MULTIPLAYER_INVITE,
      userId: invitedUserId,
    })).resolves.toBeTruthy();
    expect(to).toHaveBeenCalledWith(invitedUserId.toString());

    const liveMatches = emit.mock.calls.find(
      call => call[0] === 'privateAndInvitedMatches'
    )?.[1] as MultiplayerMatch[];

    expect(liveMatches.map(match => match.matchId)).toContain('live-private-invite');
  });
});
