import useSWRHelper from '@root/hooks/useSWRHelper';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import User, { UserWithMultiplayerProfile } from '@root/models/db/user';
import { MultiplayerMatchType } from '@root/models/MultiplayerEnums';
import Link from 'next/link';
import React, { useState } from 'react';
import MatchResults from '../matchResults';
import MultiplayerRating from '../multiplayerRating';
import MultiSelectUser from '../multiSelectUser';

interface ProfileMultiplayerProps {
  user: UserWithMultiplayerProfile;
}

export interface MultiplayerRecord {
  draws: number;
  losses: number;
  wins: number;
}

export type MultiplayerRecords = {
  [T in MultiplayerMatchType]: MultiplayerRecord;
};

export default function ProfileMultiplayer({ user }: ProfileMultiplayerProps) {
  // return a list of multiplayer games
  const qs = user._id.toString();
  const [compare, setCompare] = useState<User>();
  const [page, setPage] = useState<number>(0);
  const offset = page * 5;
  const { data: multiplayerGames } = useSWRHelper<MultiplayerMatch[]>(
    '/api/match/search?limit=5&offset=' +
      offset +
      '&players=' +
      qs +
      (compare ? ',' + compare._id.toString() : '')
  );
  const { data: records } = useSWRHelper<MultiplayerRecords>(
    '/api/match/record?' +
      (compare && compare._id.toString().length > 0
        ? 'compareUser=' + compare._id.toString() + '&'
        : '') +
      'player=' +
      qs
  );

  let displayGames = [
    <div key='loadingDisplay' className='text-center'>
      <span>Loading...</span>
    </div>,
  ];

  if (multiplayerGames) {
    displayGames = [
      <>
        {multiplayerGames.map((game) => (
          <MatchResults
            showViewLink={true}
            match={game}
            key={game._id.toString()}
          />
        ))}

        <div className='flex flex-row gap-4 text-center justify-center items-center'>
          <button
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
            id='prevPage'
            style={{
              visibility: page === 0 ? 'hidden' : 'visible',
            }}
            onClick={() => setPage(page - 1)}
          >
              Prev
          </button>

          <button
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
            id='nextPage'
            style={{
              visibility: multiplayerGames.length < 5 ? 'hidden' : 'visible',
            }}
            onClick={() => setPage(page + 1)}
          >
              Next
          </button>
        </div>

      </>,
    ];
  }

  return (
    <div className='flex flex-col gap-4 text-center justify-center items-center'>
      <h2 className='text-2xl font-bold break-words max-w-full'>
        {user.name}&apos;s Multiplayer History
      </h2>
      <div className='flex flex-row gap-2  text-center justify-center items-center'>
        <MultiSelectUser
          defaultValue={compare}
          onSelect={(selected: User) => {
            setCompare(selected);
          }}
        />
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
          <Link href='/multiplayer'>Multiplayer Lobby</Link>
        </button>
      </div>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-row gap-4 text-center justify-center items-center'>
          <MultiplayerRating
            profile={user.multiplayerProfile}
            record={records?.RushBullet}
            type={MultiplayerMatchType.RushBullet}
          />
          <MultiplayerRating
            profile={user.multiplayerProfile}
            record={records?.RushBlitz}
            type={MultiplayerMatchType.RushBlitz}
          />
          <MultiplayerRating
            profile={user.multiplayerProfile}
            record={records?.RushRapid}
            type={MultiplayerMatchType.RushRapid}
          />
          <MultiplayerRating
            profile={user.multiplayerProfile}
            record={records?.RushClassical}
            type={MultiplayerMatchType.RushClassical}
          />
        </div>
        <div className='flex flex-col gap-2 text-center justify-center items-center'>
          {displayGames}
        </div>
      </div>
    </div>
  );
}
