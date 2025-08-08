import { requestBroadcastMatch, requestBroadcastMatches } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { generateMatchLog, createSystemChatMessage, createUserActionMessage, createMatchEventMessage, createLevelActionMessage } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';

export async function matchMarkCompleteLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId
) {
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

  // Find the level being completed
  const level = (match.levels as any[]).find(l => l._id.toString() === levelId.toString());

  const updated = await MultiplayerMatchModel.findOneAndUpdate(
    {
      matchId: matchId,
      players: userId,
      // check if scoreTable.{req.userId} is set
      [`gameTable.${userId.toString()}`]: { $exists: true },
      // make sure this level is in the levels array
      levels: levelId,
      // check if game is active
      state: MultiplayerMatchState.ACTIVE,
      // check endTime is before now
      endTime: { $gte: new Date() },
    },
    {
      // increment the scoreTable.{req.userId} by 1
      $addToSet: { [`gameTable.${userId}`]: levelId },
      $push: {
        matchLog: generateMatchLog(MatchAction.COMPLETE_LEVEL, {
          userId: userId,
          levelId: levelId,
        }),
        chatMessages: createLevelActionMessage('completed', userId.toString(), userName, level),
      },
    },
    {
      new: true
    }
  ) as MultiplayerMatch;

  /*
// TODO later
  let maxLength = 0;

  for (const entry in updated.gameTable) {
    maxLength = Math.max(maxLength, updated.gameTable[entry.length].length);
  }

  const len = updated.levels.length;

  if (maxLength >= len) {
    // generate another 30 levels

  }*/
  await Promise.all([requestBroadcastMatch(updated.gameId, matchId), requestBroadcastMatches(updated.gameId)]);

  return updated;
}
