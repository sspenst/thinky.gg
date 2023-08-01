import useSWRHelper from '@root/hooks/useSWRHelper';
import { useRouter } from 'next/router';
import React, { useCallback, useContext, useState } from 'react';
import { toast } from 'react-hot-toast';
import FormattedUser from '../components/formattedUser';
import MatchStatus, { getProfileRatingDisplay } from '../components/matchStatus';
import CreateMatchModal from '../components/modal/createMatchModal';
import { AppContext } from '../contexts/appContext';
import sortByRating from '../helpers/sortByRating';
import MultiplayerMatch from '../models/db/multiplayerMatch';
import { MultiplayerMatchState, MultiplayerMatchType } from '../models/MultiplayerEnums';
import MatchResults from './matchResults';
import OnlineUsers from './onlineUsers';

export default function Multiplayer() {
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const { multiplayerSocket, user } = useContext(AppContext);
  const router = useRouter();
  const { connectedPlayers, matches, privateAndInvitedMatches } = multiplayerSocket;

  const postNewMatch = useCallback(async (matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
    toast.dismiss();
    toast.loading('Creating Match...');

    fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private: isPrivate,
        rated: isRated,
        type: matchType
      }),
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok) {
        throw res.text();
      }

      toast.dismiss();
      toast.success('Created Match');
      const createdMatch = await res.json() as MultiplayerMatch;

      if (createdMatch.private) {
        router.push(`/match/${createdMatch.matchId}`);
      }
    }).catch(async err => {
      toast.dismiss();
      toast.error(JSON.parse(await err)?.error || 'Failed to create match');
    });
  }, [router]);

  const btnCreateMatchClick = useCallback(async () => {
    setIsCreateMatchModalOpen(true);
  }, []);

  const { data: recentMatches } = useSWRHelper<MultiplayerMatch[]>('/api/match/search');

  const openMatches = [...privateAndInvitedMatches.filter(match => match.state === MultiplayerMatchState.OPEN)];

  const activeMatches = [];
  let hasCreatedMatch = false;

  for (const match of matches) {
    if (match.state === MultiplayerMatchState.OPEN) {
      openMatches.push(match);
    } else if (match.state === MultiplayerMatchState.ACTIVE) {
      activeMatches.push(match);
    }

    if (match.players.some(player => player._id.toString() === user?._id?.toString())) {
      hasCreatedMatch = true;
    }
  }

  if (!user) {
    return <span>Loading</span>;
  }

  return (<>
    <div className='flex flex-col justify-center gap-8 m-4 items-center'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <h1 className='text-4xl font-bold'>Multiplayer</h1>
        <OnlineUsers />
        <div>Play against other Pathology players in a realtime multiplayer match:</div>
        <ul>
          <li>Complete as many levels as you can</li>
          <li>Levels get progressively harder</li>
          <li>You are allowed to skip one level per match</li>
        </ul>
        {user && <>
          <div className='font-bold italic text-xl'>
          Your rating:
          </div>
          <div className='py-0.5 px-2.5 -mt-2 border rounded flex items-center gap-2' style={{
            borderColor: 'var(--bg-color-3)',
          }}>
            {getProfileRatingDisplay({ type: MultiplayerMatchType.RushBullet, profile: user.multiplayerProfile })}
            {getProfileRatingDisplay({ type: MultiplayerMatchType.RushBlitz, profile: user.multiplayerProfile })}
            {getProfileRatingDisplay({ type: MultiplayerMatchType.RushRapid, profile: user.multiplayerProfile })}
            {getProfileRatingDisplay({ type: MultiplayerMatchType.RushClassical, profile: user.multiplayerProfile })}
          </div>
        </>}
      </div>
      {!hasCreatedMatch &&
      <div id='create_button_section' className=''>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={btnCreateMatchClick}
        >
          Create Match
        </button>
      </div>
      }
      {openMatches.length > 0 &&
        <div className='flex flex-col gap-2 items-center max-w-full'>
          <h2 className='text-2xl font-bold mb-2'>Open Matches</h2>
          {openMatches.length === 0 && <span className='italic flex justify-center'>No open matches!</span>}
          {openMatches.sort((a, b) => sortByRating(a.players[0], b.players[0], MultiplayerMatchType.RushBullet)).map((match: MultiplayerMatch) => (
            <MatchStatus key={match._id.toString()} match={match} />
          ))}
        </div>
      }
      {activeMatches.length > 0 &&
        <div className='flex flex-col gap-2 items-center max-w-full'>
          <h2 className='text-2xl font-bold mb-2'>Active Matches</h2>
          {activeMatches.map((match: MultiplayerMatch) => (
            <MatchStatus key={match._id.toString()} match={match} />
          ))}
        </div>
      }
      <div className='flex flex-col gap-4 max-w-full'>
        <h2 className='text-2xl font-bold flex justify-center'>Currently Online</h2>
        <div className='flex flex-col gap-2'>
          {connectedPlayers.map(player => (
            <div key={'multiplayer-' + player._id.toString()} className='flex items-center gap-2'>
              <FormattedUser user={player} />
              {getProfileRatingDisplay({ type: MultiplayerMatchType.RushBullet, profile: player.multiplayerProfile })}
              {getProfileRatingDisplay({ type: MultiplayerMatchType.RushBlitz, profile: player.multiplayerProfile })}
              {getProfileRatingDisplay({ type: MultiplayerMatchType.RushRapid, profile: player.multiplayerProfile })}
              {getProfileRatingDisplay({ type: MultiplayerMatchType.RushClassical, profile: player.multiplayerProfile })}
            </div>
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-2 items-center max-w-full'>
        <h2 className='text-2xl font-bold mb-2'>Recent Matches</h2>
        {!recentMatches || recentMatches.length === 0 && <span className='italic flex justify-center'>No active matches!</span>}
        {recentMatches && recentMatches.map((match: MultiplayerMatch) => (
          <MatchResults key={match._id.toString()} match={match} showViewLink={true} />
        ))}
      </div>
    </div>
    <CreateMatchModal
      isOpen={isCreateMatchModalOpen}
      closeModal={() => setIsCreateMatchModalOpen(false) }
      onConfirm={(matchType: MultiplayerMatchType, isPrivate: boolean, isRated: boolean) => {
        setIsCreateMatchModalOpen(false);
        postNewMatch(matchType, isPrivate, isRated);
      }}
    />
  </>);
}
