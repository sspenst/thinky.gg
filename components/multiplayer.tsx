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
import { MatchAction, MatchLogDataGameRecap, MultiplayerMatchState, MultiplayerMatchType } from '../models/MultiplayerEnums';
import MatchStatusSmall from './matchStatusSmall';
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
  const { data: recentMatches, mutate: mutateRecentMatches } = useSWRHelper<MultiplayerMatch[]>('/api/match/search');

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
    <div className='flex flex-col items-center justify-center p-4 gap-4'>
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
          {getProfileRatingDisplay(MultiplayerMatchType.RushBullet, user.multiplayerProfile)}
          {getProfileRatingDisplay(MultiplayerMatchType.RushBlitz, user.multiplayerProfile)}
          {getProfileRatingDisplay(MultiplayerMatchType.RushRapid, user.multiplayerProfile)}
          {getProfileRatingDisplay(MultiplayerMatchType.RushClassical, user.multiplayerProfile)}
        </div>
      </>}
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

      <div className='flex flex-wrap justify-center gap-4 mx-4'>
        <div className='flex flex-col gap-4'>
          <h2 className='text-2xl font-bold flex justify-center'>Currently online</h2>
          <div className='flex flex-col gap-2'>
            {connectedPlayers.map(player => (
              <div key={'multiplayer-' + player._id.toString()} className='flex items-center gap-2'>
                <FormattedUser user={player} />
                {getProfileRatingDisplay(MultiplayerMatchType.RushBullet, player.multiplayerProfile)}
                {getProfileRatingDisplay(MultiplayerMatchType.RushBlitz, player.multiplayerProfile)}
                {getProfileRatingDisplay(MultiplayerMatchType.RushRapid, player.multiplayerProfile)}
                {getProfileRatingDisplay(MultiplayerMatchType.RushClassical, player.multiplayerProfile)}
              </div>
            ))}
          </div>
        </div>
        <div className='flex flex-col gap-2'>
          <h2 className='text-2xl font-bold mb-2 flex justify-center'>Open matches</h2>
          {openMatches.length === 0 && <span className='italic flex justify-center'>No open matches!</span>}
          {openMatches.sort((a, b) => sortByRating(a.players[0], b.players[0], MultiplayerMatchType.RushBullet)).map((match: MultiplayerMatch) => (
            <MatchStatus key={match._id.toString()} match={match} />
          ))}
        </div>
        <div className='flex flex-col gap-2'>
          <h2 className='text-2xl font-bold mb-2 flex justify-center'>Active matches</h2>
          {activeMatches.length === 0 && <span className='italic flex justify-center'>No active matches!</span>}
          {activeMatches.map((match: MultiplayerMatch) => (
            <MatchStatus key={match._id.toString()} match={match} />
          ))}
        </div>

      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='text-2xl font-bold mb-2 flex justify-center align-center'>
          Recently finished matches</h2>
        {!recentMatches || recentMatches.length === 0 && <span className='italic flex justify-center'>No active matches!</span>}

        {recentMatches && recentMatches.map((match: MultiplayerMatch) => (
          <MatchStatusSmall key={match._id.toString()} match={match} recap={match.matchLog?.find(log => log.type === MatchAction.GAME_RECAP)?.data as MatchLogDataGameRecap} />
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
