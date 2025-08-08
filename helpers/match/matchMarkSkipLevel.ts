import { requestBroadcastMatch, requestBroadcastMatches } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { generateMatchLog, SKIP_MATCH_LEVEL_ID, createSystemChatMessage, createUserActionMessage, createMatchEventMessage, createLevelActionMessage } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';

export async function matchMarkSkipLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId
) {
  const skipId = new Types.ObjectId(SKIP_MATCH_LEVEL_ID);

  // First get the match to find the user's name and populate levels
  const match = await MultiplayerMatchModel.findOne({
    matchId: matchId,
    players: userId,
  }).populate('players').populate('levels');

  if (!match) {
    return null;
  }

  // Find the user's name
  const user = (match.players as any[]).find(player => player._id.toString() === userId.toString());
  const userName = user ? user.name : 'A player';

  // Find the level being skipped
  const level = (match.levels as any[]).find(l => l._id.toString() === levelId.toString());

  const updated = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      // check if scoreTable.{req.userId} is set
      [`gameTable.${userId.toString()}`]: { $exists: true },
      [`gameTable.${userId.toString()}`]: { $ne: skipId },
      // check if game is active
      state: MultiplayerMatchState.ACTIVE,

      // check endTime is before now
      endTime: { $gte: new Date() },
    },
    {
      // add all zeros to mark skipped
      $addToSet: { [`gameTable.${userId.toString()}`]: skipId },
      $push: {
        matchLog: generateMatchLog(MatchAction.SKIP_LEVEL, {
          userId: userId,
          levelId: levelId,
        }),
        chatMessages: createLevelActionMessage('skipped', userId.toString(), userName, level),
      },
    },
    {
      new: true
    }
  );

  if (!updated) {
    return null;
  }

  await requestBroadcastMatch(updated.gameId, matchId);
  await requestBroadcastMatches(updated.gameId);

  return updated;
}
