import { GetServerSidePropsContext, NextApiRequest } from 'next';
import React, { useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FormattedUser from '../../components/formattedUser';
import MultiplayerMatchLobbyItem from '../../components/multiplayerMatchLobbyItem';
import Page from '../../components/page';
import { AppContext } from '../../contexts/appContext';
import { PageContext } from '../../contexts/pageContext';
import { getUserFromToken } from '../../lib/withAuth';
import MultiplayerMatch from '../../models/db/multiplayerMatch';
import { ReqUser } from '../../models/db/user';
/*
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const token = context.req?.cookies?.token;
  const reqUser = token ? await getUserFromToken(token, context.req as NextApiRequest) : null;

  return {
    props: {
      JSON.stringify(reqUser),
    },
  };
}*/

export default function Match({ reqUser }: {reqUser?: ReqUser}) {
  const [matches, setMatches] = React.useState([]);

  const fetchMatches = useCallback( async () => {
    const res = await fetch('/api/match');
    const data = await res.json();

    setMatches(data);
  }, []);

  // Every 5 seconds fetch Matches
  useEffect(() => {
    fetchMatches();

    const interval = setInterval(() => {
      fetchMatches();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchMatches]);

  const btnLeaveMatch = async (matchId: string) => {
    toast.dismiss();
    toast.loading('Leaving Match...');
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'quit',
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to leave match');
    } else {
      toast.dismiss();
      toast.success('Left Match');
    }

    fetchMatches();
  };
  const btnJoinMatch = async (matchId: string) => {
    toast.dismiss();
    toast.loading('Joining Match...');
    const res = await fetch(`/api/match/${matchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'join',
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to join match');
    } else {
      toast.dismiss();
      toast.success('Joined Match');
    }

    fetchMatches();
  };
  const btnCreateMatchClick = async () => {
    toast.dismiss();
    toast.loading('Creating Match...');
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test',
      }),
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok) {
      toast.dismiss();
      toast.error(data.error || 'Failed to create match');
    } else {
      toast.dismiss();
      toast.success('Created Match');
    }

    fetchMatches();
  };

  return (
    <Page title='Multiplayer Match'>
      <div className='flex flex-col items-center justify-center p-3'>
        <h1 className='text-4xl font-bold'>Lobby</h1>
        <p>Play against other Pathology players in a realtime multiplayer match</p>
        <div id='create_button_section' className='p-3'>
          <button
            onClick={btnCreateMatchClick}
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
                Create Match
          </button>
        </div>

        <div id='match_list_section' className='flex flex-col items-center justify-center p-3'>
          <h2 className='text-2xl font-bold'>Select a game</h2>
          <p>Join a match in progress</p>
          {matches.map((match: MultiplayerMatch) => (
            <MultiplayerMatchLobbyItem key={match._id.toString()} match={match} onJoinClick={btnJoinMatch} onLeaveClick={btnLeaveMatch} />
          ))}

        </div>

      </div>
    </Page>
  );
}
