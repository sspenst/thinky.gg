import MultiplayerMatch from '@root/models/db/multiplayerMatch';

interface CountdownDisplayProps {
  countDown: number;
  match: MultiplayerMatch;
}

export default function CountdownDisplay({ countDown, match }: CountdownDisplayProps) {
  const timeUntilEndCleanStr = `${Math.floor(countDown / 60)}:${((countDown % 60) >> 0).toString().padStart(2, '0')}`;

  if (countDown <= 0) return null;

  // Check if all players are ready - if so, show "Starting in", otherwise "Aborting in"
  const allPlayersReady = match.players.length > 0 && match.markedReady.length === match.players.length;
  const isStarting = allPlayersReady;

  return (
    <div className='relative animate-pulse'>
      <div className={`absolute -inset-2 blur-lg opacity-50 ${
        isStarting
          ? 'bg-gradient-to-r from-green-600/20 to-blue-600/20'
          : 'bg-gradient-to-r from-red-600/20 to-orange-600/20'
      }`} />
      <div className='relative bg-white/10 backdrop-blur-xl rounded-xl p-2 shadow-lg border border-white/20'>
        <h1 className='text-lg font-bold text-center'>
          <span className={`bg-clip-text text-transparent ${
            isStarting
              ? 'bg-gradient-to-r from-green-400 to-blue-400'
              : 'bg-gradient-to-r from-red-400 to-orange-400'
          }`}>
            {isStarting ? 'Starting' : 'Aborting'} in {timeUntilEndCleanStr}
          </span>
        </h1>
      </div>
    </div>
  );
}
