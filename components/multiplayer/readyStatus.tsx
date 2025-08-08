import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { Types } from 'mongoose';

interface ReadyStatusProps {
  match: MultiplayerMatch;
  user: UserWithMultiplayerProfile | null;
}

export default function ReadyStatus({ match, user }: ReadyStatusProps) {
  if (!(match.state === MultiplayerMatchState.ACTIVE && match.timeUntilStart > 0)) {
    return null;
  }

  return (
    <div className='w-80 relative animate-fadeInUp' style={{ animationDelay: '0.2s' }}>
      <div className='absolute -inset-2 bg-gradient-to-r from-green-600/15 to-blue-600/15 blur-lg opacity-40' />
      <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
        <div className='text-center'>
          <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3'>
            {match.markedReady.length == 2 ? (
              <span className='text-2xl text-white'>✅</span>
            ) : (
              <span className='text-2xl text-white'>⏳</span>
            )}
          </div>
          {match.markedReady.length == 2 && (
            <div className='text-green-400 font-semibold'>Both players ready!</div>
          )}
          {match.markedReady.length === 0 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
            <div className='text-yellow-400'>Not ready</div>
          )}
          {match.markedReady.length === 1 && user && !(match.markedReady as Types.ObjectId[]).includes(user._id) && (
            <div className='text-purple-400 flex flex-col'>
            <span><strong>{(match.players.find(p => match.markedReady.some((id: any) => id.toString() === p._id.toString()))?.name || 'other')}</strong></span>
            <span>is ready</span>
          </div>
          )}
          {match.markedReady.length !== 2 && user && (match.markedReady as Types.ObjectId[]).includes(user._id) && (
            <div className='text-purple-400 flex flex-col'>
              <span>Waiting on <strong>{(match.players.find(p => !match.markedReady.some((id: any) => id.toString() === p._id.toString()))?.name || 'other')}</strong></span>
              <span>to mark ready</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
