import React from 'react';

interface ErrorStateProps {
  authError: string;
  onRetry: () => void;
}

export default function ErrorState({ authError, onRetry }: ErrorStateProps) {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-red-600 rounded-lg p-6 max-w-md text-center'>
        <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg className='w-6 h-6 text-red-600' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' />
          </svg>
        </div>
        <h2 className='text-xl font-bold mb-2'>Authentication Failed</h2>
        <p className='text-sm mb-4'>{authError}</p>
        <button
          onClick={onRetry}
          className='bg-white text-red-600 px-4 py-2 rounded hover:bg-gray-100 transition-colors'
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
