import { DEFAULT_GAME_ID, GameId } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { MultiplayerMatchState, MultiplayerMatchType } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel, NotificationModel } from '@root/models/mongoose';
import { broadcastPrivateAndInvitedMatches, broadcastTerminalMatch } from '@root/server/socket/socketFunctions';
import { Emitter } from '@socket.io/mongo-emitter';
import { Types } from 'mongoose';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

describe('broadcastTerminalMatch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('emits only public terminal identity and state to the game lobby', async () => {
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const emitter = { to } as unknown as Emitter;

    const didEmit = await broadcastTerminalMatch(GameId.THINKY, emitter, {
      matchId: 'private-match',
      players: [],
      private: false,
      state: MultiplayerMatchState.ABORTED,
    });

    expect(didEmit).toBe(true);
    expect(to).toHaveBeenCalledWith('LOBBY-thinky');
    expect(emit).toHaveBeenCalledWith('terminalMatch', {
      matchId: 'private-match',
      state: MultiplayerMatchState.ABORTED,
    });
  });

  test('does not emit for an ongoing match', async () => {
    const to = jest.fn();
    const emitter = { to } as unknown as Emitter;

    const didEmit = await broadcastTerminalMatch(GameId.THINKY, emitter, {
      matchId: 'active-match',
      players: [],
      private: false,
      state: MultiplayerMatchState.ACTIVE,
    });

    expect(didEmit).toBe(false);
    expect(to).not.toHaveBeenCalled();
  });

  test('targets private terminal identity only to non-player invitee rooms', async () => {
    const playerId = new Types.ObjectId();
    const inviteeId = new Types.ObjectId();
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const emitter = { to } as unknown as Emitter;
    const distinct = jest.spyOn(NotificationModel, 'distinct').mockResolvedValue([
      playerId,
      inviteeId,
    ]);
    const privateMatch = {
      matchId: 'private-capability-id',
      players: [{ _id: playerId }],
      private: true,
      state: MultiplayerMatchState.FINISHED,
    } as unknown as MultiplayerMatch;

    const didEmit = await broadcastTerminalMatch(GameId.THINKY, emitter, privateMatch);

    expect(didEmit).toBe(true);
    expect(distinct).toHaveBeenCalledWith('userId', {
      gameId: GameId.THINKY,
      message: 'private-capability-id',
      type: NotificationType.MULTIPLAYER_INVITE,
    });
    expect(to).not.toHaveBeenCalledWith('LOBBY-thinky');
    expect(to).not.toHaveBeenCalledWith(playerId.toString());
    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith(inviteeId.toString());
    expect(emit).toHaveBeenCalledWith('terminalMatch', {
      matchId: 'private-capability-id',
      state: MultiplayerMatchState.FINISHED,
    });
  });
});

describe('broadcastPrivateAndInvitedMatches', () => {
  const testMatchIds = [
    'socket-private-player',
    'socket-private-creator',
    'socket-private-invited',
    'socket-private-uninvited',
  ];

  afterEach(async () => {
    await Promise.all([
      MultiplayerMatchModel.deleteMany({ matchId: { $in: testMatchIds } }),
      NotificationModel.deleteMany({ message: { $in: testMatchIds } }),
    ]);
  });

  test('includes only private matches the user plays, created, or was invited to', async () => {
    const userId = new Types.ObjectId(TestId.USER);

    await Promise.all([
      MultiplayerMatchModel.create({
        createdBy: TestId.USER_B,
        gameId: DEFAULT_GAME_ID,
        matchId: 'socket-private-player',
        matchLog: [],
        players: [userId],
        private: true,
        state: MultiplayerMatchState.OPEN,
        type: MultiplayerMatchType.RushBullet,
      }),
      MultiplayerMatchModel.create({
        createdBy: userId,
        gameId: DEFAULT_GAME_ID,
        matchId: 'socket-private-creator',
        matchLog: [],
        players: [TestId.USER_B],
        private: true,
        state: MultiplayerMatchState.OPEN,
        type: MultiplayerMatchType.RushBullet,
      }),
      MultiplayerMatchModel.create({
        createdBy: TestId.USER_B,
        gameId: DEFAULT_GAME_ID,
        matchId: 'socket-private-invited',
        matchLog: [],
        players: [TestId.USER_B],
        private: true,
        state: MultiplayerMatchState.OPEN,
        type: MultiplayerMatchType.RushBullet,
      }),
      MultiplayerMatchModel.create({
        createdBy: TestId.USER_C,
        gameId: DEFAULT_GAME_ID,
        matchId: 'socket-private-uninvited',
        matchLog: [],
        players: [TestId.USER_C],
        private: true,
        state: MultiplayerMatchState.OPEN,
        type: MultiplayerMatchType.RushBullet,
      }),
      NotificationModel.create({
        gameId: DEFAULT_GAME_ID,
        message: 'socket-private-invited',
        read: true,
        type: NotificationType.MULTIPLAYER_INVITE,
        userId,
      }),
    ]);
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const emitter = { to } as unknown as Emitter;

    await broadcastPrivateAndInvitedMatches(DEFAULT_GAME_ID, emitter, userId);

    expect(to).toHaveBeenCalledWith(userId.toString());
    const matches = emit.mock.calls.find(call => call[0] === 'privateAndInvitedMatches')?.[1] as MultiplayerMatch[];
    const matchIds = matches.map(match => match.matchId).sort();

    expect(matchIds).toEqual([
      'socket-private-creator',
      'socket-private-invited',
      'socket-private-player',
    ]);
    expect(matchIds).not.toContain('socket-private-uninvited');
  });
});
