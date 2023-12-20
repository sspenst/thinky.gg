import { requestBroadcastMatch, requestBroadcastMatches } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { generateMatchLog } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';

export async function matchMarkCompleteLevel(
  userId: Types.ObjectId,
  matchId: string,
  levelId: Types.ObjectId
) {
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
