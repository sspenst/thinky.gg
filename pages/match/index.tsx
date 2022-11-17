import React from 'react';
import { toast } from 'react-hot-toast';
import FormattedUser from '../../components/formattedUser';
import Page from '../../components/page';
import MultiplayerMatch from '../../models/db/multiplayerMatch';

export function getServerSideProps() {
  return {
    props: {

    },
  };
}

export default function Match() {
  const [matches, setMatches] = React.useState([]);
  const fetchMatches = async () => {
    const res = await fetch('/api/match');
    const data = await res.json();

    setMatches(data);
  };

  fetchMatches();

  const btnJoinMatch = async (matchId: string) => {
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
    }
  };
  const btnCreateMatchClick = async () => {
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
    }

    console.log(data);
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
            <div key={match._id.toString()} className='p-3 bg-gray-700 rounded flex flex-row gap-20'>
              <FormattedUser user={match.createdBy} />
              <button
                onClick={() => btnJoinMatch(match._id.toString())}
                className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
                Join
              </button>
            </div>
          ))}

        </div>

      </div>
    </Page>
  );
}
