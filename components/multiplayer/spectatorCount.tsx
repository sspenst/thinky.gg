import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import { UserWithMultiplayerProfile } from '@root/models/db/user';

interface SpectatorCountProps {
  connectedPlayersInRoom?: {count: number, users: UserWithMultiplayerProfile[]};
  matchState?: MultiplayerMatchState;
}

export default function SpectatorCount({ connectedPlayersInRoom, matchState }: SpectatorCountProps) {
  if (!connectedPlayersInRoom) {
    return null;
  }

  const isFinished = matchState === MultiplayerMatchState.FINISHED || matchState === MultiplayerMatchState.ABORTED;
  const isOpen = matchState === MultiplayerMatchState.OPEN;
  const isActive = matchState === MultiplayerMatchState.ACTIVE;

  // For finished matches, show total viewers (don't subtract players)
  // For open matches, show total viewers (don't subtract players since they might not be playing yet)
  // For active matches, show spectators (subtract 2 active players)
  let count: number;
  let label: string;

  if (isFinished) {
    count = connectedPlayersInRoom.count;
    label = 'viewing';
  } else if (isOpen) {
    count = connectedPlayersInRoom.count;
    label = 'viewing';
  } else if (isActive) {
    count = connectedPlayersInRoom.count - 2;
    label = 'spectating';
  } else {
    count = connectedPlayersInRoom.count;
    label = 'viewing';
  }

  if (count <= 0) {
    return null;
  }

  return (
    <div className='absolute top-4 right-4 animate-fadeInRight' style={{ zIndex: 100 }}>
      <div className='bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/20'>
        <span className='text-sm text-white/80'>
          👁️ {count} {label}
        </span>
      </div>
    </div>
  );
}
