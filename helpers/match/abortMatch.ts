import { requestClearBroadcastMatchSchedule } from '@root/lib/appSocketToClient';
import { MatchAction, MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { MultiplayerMatchModel } from '@root/models/mongoose';
import { generateMatchLog } from '@root/models/schemas/multiplayerMatchSchema';
import { Types } from 'mongoose';

export async function abortMatch(matchId: string, userId: Types.ObjectId) {
  await requestClearBroadcastMatchSchedule(matchId);
  const log = generateMatchLog(MatchAction.ABORTED, {
    userId: userId,
  });
  const updatedMatch = await MultiplayerMatchModel.updateOne(
    {
      matchId: matchId,
      state: MultiplayerMatchState.ACTIVE,
    },
    {
      state: MultiplayerMatchState.ABORTED,
      $push: {
        matchLog: log,
      },
    }
  );

  return updatedMatch.modifiedCount > 0;
}
