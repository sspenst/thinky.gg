import { MultiplayerMatchState } from '@root/models/constants/multiplayer';
import MultiplayerMatch from '@root/models/db/multiplayerMatch';
import { UserWithMultiplayerProfile } from '@root/models/db/user';
import { Types } from 'mongoose';
import { useEffect, useState } from 'react';

interface MarkReadyButtonProps {
  match: MultiplayerMatch;
  user: UserWithMultiplayerProfile | null;
  onMarkReady: () => void;
  onUnmarkReady: () => void;
}

export default function MarkReadyButton({ match, user, onMarkReady, onUnmarkReady }: MarkReadyButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isActive = match.state === MultiplayerMatchState.ACTIVE;
  const hasTimeUntilStart = match.timeUntilStart > 0;
  const hasUser = !!user;
  const isAlreadyReady = user ? (match.markedReady as Types.ObjectId[]).some(readyId => readyId.toString() === user._id.toString()) : false;

  const shouldShow = isActive && hasTimeUntilStart && hasUser;

  // Reset loading state when match updates (socket broadcast received)
  useEffect(() => {
    setIsLoading(false);
  }, [match]);

  if (!shouldShow) {
    return null;
  }

  if (isAlreadyReady) {
    return (
      <div className='relative animate-fadeInUp w-full flex justify-center' style={{ animationDelay: '0.4s' }}>
        <div className='relative'>
          {/* Glassmorphism background effect for unready */}
          <div className='absolute -inset-4 bg-gradient-to-r from-orange-600/20 to-red-600/20 blur-lg opacity-50' />
          <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
            <div className='flex flex-col gap-4 justify-center items-center'>
              {/* Check mark icon */}
              <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='text-green-400' viewBox='0 0 16 16'>
                <path d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z' />
              </svg>

              {/* Unready button */}
              <button
                className={`group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
                onClick={() => {
                  setIsLoading(true);
                  onUnmarkReady();
                }}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
                <div className='relative flex items-center gap-3 justify-center'>
                  <span className='text-xl'>✗</span>
                  <span>{isLoading ? 'Unmarking...' : 'Not Ready'}</span>
                </div>
              </button>

              {/* Status text */}
              <p className='text-sm text-green-400 text-center'>
                You&apos;re marked as ready!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative animate-fadeInUp w-full flex justify-center' style={{ animationDelay: '0.4s' }}>
      <div className='relative'>
        {/* Glassmorphism background effect */}
        <div className='absolute -inset-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 blur-lg opacity-50' />
        <div className='relative bg-white/8 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20'>
          <div className='flex flex-col gap-4 justify-center items-center'>
            {/* Animated arrow pointing down */}
            <svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='currentColor' className='animate-bounce text-green-400' viewBox='0 0 16 16'>
              <path d='M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z' />
            </svg>

            {/* Ready button with enhanced styling */}
            <button
              className={`group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
              onClick={() => {
                setIsLoading(true);
                onMarkReady();
              }}
            >
              <div className='absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-20 transform skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-700' />
              <div className='relative flex items-center gap-3 justify-center'>
                <span className='text-xl'>✓</span>
                <span>{isLoading ? 'Marking...' : 'I\'m Ready!'}</span>
              </div>
            </button>

            {/* Hint text */}
            <p className='text-sm text-white/70 text-center'>
              Click when you&apos;re ready to begin the match
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
