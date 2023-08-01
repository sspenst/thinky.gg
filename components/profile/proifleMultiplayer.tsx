import useSWRHelper from '@root/hooks/useSWRHelper';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { MultiplayerMatchType } from '@root/models/MultiplayerEnums';
import React from 'react';
import MatchResults from '../matchResults';
import { getProfileRatingDisplay } from '../matchStatus';

interface ProfileMultiplayerProps {
  user: UserWithMultiplayerProfile;
  records?: {
    RushBullet?: { wins: number; losses: number; draws: number };
    RushBlitz?: { wins: number; losses: number; draws: number };
    RushRapid?: { wins: number; losses: number; draws: number };
    RushClassical?: { wins: number; losses: number; draws: number };
  };
}

export default function ProfileMultiplayer({ user, records }: ProfileMultiplayerProps) {
  // return a list of multiplayer games
  const { data: multiplayerGames } = useSWRHelper<MultiplayerMatch[]>(
    '/api/match/search?limit=100&players=' + user._id.toString()
  );

  if (!multiplayerGames) {
    return <span>Loading...</span>;
  }

  return (
    <div className='flex flex-col gap-4 text-center justify-center items-center'>
      <h2 className='text-2xl font-bold break-words max-w-full'>
        Multiplayer Games
      </h2>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-row gap-4 text-center justify-center items-center'>
          {getProfileRatingDisplay({
            type: MultiplayerMatchType.RushBullet,
            profile: user.multiplayerProfile,
            hideType: false,
            record: records?.RushBullet
          }
          )}
          {getProfileRatingDisplay({
            type: MultiplayerMatchType.RushBlitz,
            profile: user.multiplayerProfile,
            hideType: false,
            record: records?.RushBlitz
          }
          )}
          {getProfileRatingDisplay({
            type: MultiplayerMatchType.RushRapid,
            profile: user.multiplayerProfile,
            hideType: false,
            record: records?.RushRapid
          }
          )}
          {getProfileRatingDisplay({
            type: MultiplayerMatchType.RushClassical,
            profile: user.multiplayerProfile,
            hideType: false,
            record: records?.RushClassical
          }
          )}
        </div>
        <div className='flex flex-col gap-4 text-center justify-center items-center'>
          {multiplayerGames.map((game) => (
            <MatchResults
              showViewLink={true}
              match={game}
              key={game._id.toString()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
