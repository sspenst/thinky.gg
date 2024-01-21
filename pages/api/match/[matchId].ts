import DiscordChannel from '@root/constants/discordChannel';
import { GameId } from '@root/constants/GameId';
import queueDiscordWebhook from '@root/helpers/discordWebhook';
import { getEnrichUserConfigPipelineStage } from '@root/helpers/enrich';
import { getGameFromId } from '@root/helpers/getGameIdFromReq';
import { generateLevels } from '@root/helpers/match/generateLevels';
import { getMatch } from '@root/helpers/match/getMatch';
import { matchMarkSkipLevel } from '@root/helpers/match/matchMarkSkipLevel';
import { quitMatch } from '@root/helpers/match/quitMatch';
import { multiplayerMatchTypeToText } from '@root/helpers/multiplayerHelperFunctions';
import { USER_DEFAULT_PROJECTION } from '@root/models/schemas/userSchema';
import { PipelineStage } from 'mongoose';
import { NextApiResponse } from 'next';
import { DIFFICULTY_INDEX } from '../../../components/formatted/formattedDifficulty';
import { ValidEnum } from '../../../helpers/apiWrapper';
import { requestBroadcastMatch, requestBroadcastMatches, requestBroadcastPrivateAndInvitedMatches, requestScheduleBroadcastMatch } from '../../../lib/appSocketToClient';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { MatchAction, MultiplayerMatchState, MultiplayerMatchType, MultiplayerMatchTypeDurationMap } from '../../../models/constants/multiplayer';
import Level from '../../../models/db/level';
import MultiplayerMatch from '../../../models/db/multiplayerMatch';
import { LevelModel, MultiplayerMatchModel, UserModel } from '../../../models/mongoose';
import { enrichMultiplayerMatch, generateMatchLog } from '../../../models/schemas/multiplayerMatchSchema';

export default withAuth(
  {
    GET: {},
    PUT: {
      body: {
        action: ValidEnum([
          MatchAction.JOIN,
          MatchAction.MARK_READY,
          MatchAction.QUIT,
          MatchAction.SKIP_LEVEL,
        ]),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { matchId } = req.query;

    if (req.method === 'GET') {
      const match = await getMatch(req.gameId, matchId as string, req.user);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      return res.status(200).json(match);
    } else if (req.method === 'PUT') {
      const { action, levelId } = req.body;

      if (action === MatchAction.MARK_READY) {
        const updateMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            players: req.user._id,
            state: MultiplayerMatchState.ACTIVE,
            startTime: {
              $gte: new Date(), // has not started yet but about to start
            }
          },
          {
            $addToSet: { markedReady: req.user._id },
          },
          { new: true }
        );

        if (updateMatch.length === 0) {
          return res.status(400).json({
            error: 'Cannot mark yourself ready in this match',
          });
        }

        await requestBroadcastMatch(updateMatch.gameId, matchId as string);

        return res.status(200).json({ success: true });
      } else if (action === MatchAction.JOIN) {
        // joining this match... Should also start the match!
        const involvedMatch = await MultiplayerMatchModel.findOne(
          {
            players: req.user._id,
            state: {
              $in: [MultiplayerMatchState.ACTIVE, MultiplayerMatchState.OPEN],
            },
            gameId: req.gameId,
          },
        ).lean<MultiplayerMatch>();

        if (involvedMatch && involvedMatch.matchId !== matchId) {
          // if reqUser is involved in their own match (still OPEN), then we
          // can safely quit that match and allow them to join the new match
          if (involvedMatch.state === MultiplayerMatchState.OPEN) {
            await quitMatch(involvedMatch.matchId as string, req.user._id);
          } else {
            return res.status(400).json({
              error:
                'You are already involved in a match that has started. Quit one to join this one.',
            });
          }
        }

        const log = generateMatchLog(MatchAction.JOIN, {
          userId: req.user._id,
        });
        const match = await MultiplayerMatchModel.findOne<MultiplayerMatch>({
          matchId: matchId,
        }) as MultiplayerMatch;

        const updatedMatch = await MultiplayerMatchModel.findOneAndUpdate(
          {
            matchId: matchId,
            state: MultiplayerMatchState.OPEN,
            players: {
              $nin: [req.user._id],
              // size should be 1
              $size: 1,
            },
          },
          {
            $push: {
              players: req.user._id,
              matchLog: log,
            },
            startTime: Date.now() + 15000, // start 15 seconds into the future...
            endTime: Date.now() + 15000 + MultiplayerMatchTypeDurationMap[match.type as MultiplayerMatchType], // end 3 minute after start
            state: MultiplayerMatchState.ACTIVE,
          },
          { new: true }
        ).lean<MultiplayerMatch>();

        //populate: ['players', 'winners', 'levels']

        if (!updatedMatch) {
          res
            .status(400)
            .json({ error: 'Match not found or you are already in the match' });

          return;
        }

        const matchPopulated = await MultiplayerMatchModel.aggregate<MultiplayerMatch>([
          {
            $match: {
              matchId: matchId,
            },
          },
          {
            $lookup: {
              from: UserModel.collection.name,
              localField: 'players',
              foreignField: '_id',
              as: 'players',
              pipeline: [
                {
                  $project: USER_DEFAULT_PROJECTION
                },
                ...getEnrichUserConfigPipelineStage(updatedMatch.gameId) as PipelineStage.Lookup[],
              ]
            },
          },
          {
            $lookup: {
              from: UserModel.collection.name,
              localField: 'winners',
              foreignField: '_id',
              as: 'winners',
              pipeline: [
                {
                  $project: USER_DEFAULT_PROJECTION
                },
                ...getEnrichUserConfigPipelineStage(updatedMatch.gameId) as PipelineStage.Lookup[],
              ]
            },
          },
          {
            $lookup: {
              from: LevelModel.collection.name,
              localField: 'levels',
              foreignField: '_id',
              as: 'levels',
            },
          },
        ]);

        if (matchPopulated.length === 0) {
          return res.status(500).json({ error: 'Error populating match' });
        }

        const populatedMatch = matchPopulated[0];

        if (populatedMatch.players.length === 2) {
          const level0s = generateLevels(
            populatedMatch.gameId,
            DIFFICULTY_INDEX.KINDERGARTEN,
            DIFFICULTY_INDEX.ELEMENTARY,
            {
              minSteps: 6,
              maxSteps: 25,
              minLaplace: 0.5,
            },
            10
          );
          const level1s = generateLevels(
            populatedMatch.gameId,
            DIFFICULTY_INDEX.JUNIOR_HIGH,
            DIFFICULTY_INDEX.HIGH_SCHOOL,
            {},
            20
          );
          const level2s = generateLevels(
            populatedMatch.gameId,
            DIFFICULTY_INDEX.BACHELORS,
            DIFFICULTY_INDEX.PROFESSOR,
            {},
            5
          );
          const level3s = generateLevels(
            populatedMatch.gameId,
            DIFFICULTY_INDEX.PHD,
            DIFFICULTY_INDEX.SUPER_GRANDMASTER,
            {},
            5
          );

          const [l0, l1, l2, l3] = await Promise.all([
            level0s,
            level1s,
            level2s,
            level3s,
          ]);

          // dedupe these level ids, just in case though it should be extremely rare
          const dedupedLevels = new Set([...l0, ...l1, ...l2, ...l3]);

          if (dedupedLevels.size < 40) {
            // we don't have enough levels, so try and query any levels at all...
            // @TODO: Remove this when games have enough levels
            const level4s = await LevelModel.find<Level[]>({
              isDraft: { $ne: true },
              isDeleted: { $ne: true },
              gameId: populatedMatch.gameId }, { _id: 1 }, { limit: 40 - dedupedLevels.size }).lean<Level[]>();

            level4s.forEach(level => dedupedLevels.add(level));
          }

          // add levels to match
          const matchUrl = `${req.headers.origin}/match/${matchId}`;
          const game = getGameFromId(populatedMatch.gameId);
          const discordChannel = game.id === GameId.SOKOPATH ? DiscordChannel.SokopathMultiplayer : DiscordChannel.PathologyMultiplayer;
          const discordMessage = `*${multiplayerMatchTypeToText(match.type)}* match starting between ${populatedMatch.players?.map(p => `**${p.name}**`).join(' and ')}! [Spectate here](<${matchUrl}>)`;

          Promise.all([
            MultiplayerMatchModel.updateOne(
              { matchId: matchId },
              {
                levels: [...dedupedLevels].map((level: Level) => level._id),
                gameTable: {
                  [populatedMatch.players[0]._id.toString()]: [],
                  [populatedMatch.players[1]._id.toString()]: [],
                },
              }
            ),
            !match.private && queueDiscordWebhook(discordChannel, discordMessage),
          ]);
        }

        enrichMultiplayerMatch(populatedMatch, req.userId);

        await Promise.all([
          requestBroadcastMatches(populatedMatch.gameId),
          requestBroadcastPrivateAndInvitedMatches(populatedMatch.gameId, req.user._id),
          requestBroadcastMatch(populatedMatch.gameId, populatedMatch.matchId),
          requestScheduleBroadcastMatch(populatedMatch.gameId, populatedMatch.matchId),
        ]);

        return res.status(200).json(populatedMatch);
      } else if (action === MatchAction.QUIT) {
        const updatedMatch = await quitMatch(matchId as string, req.user._id);

        if (!updatedMatch) {
          return res.status(400).json({ error: 'Match not found' });
        }

        await requestBroadcastPrivateAndInvitedMatches(updatedMatch.gameId, req.user._id);

        return res.status(200).json(updatedMatch);
      } else if (action === MatchAction.SKIP_LEVEL) {
        // skipping level
        const result = await matchMarkSkipLevel(
          req.user._id,
          matchId as string,
          levelId,
        );

        return result
          ? res.status(200).json({ success: true })
          : res.status(400).json({ error: 'Already used skip' });
      }
    }
  }
);
