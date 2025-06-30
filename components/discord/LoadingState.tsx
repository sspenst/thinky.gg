import React from 'react';

export default function LoadingState() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-blue-600 rounded-lg p-6 max-w-md text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4' />
        <h2 className='text-xl font-bold mb-2'>Loading Discord Activity...</h2>
        <p className='text-sm'>Initializing Discord embedded activity</p>
        <p className='text-xs mt-2 text-gray-300'>Client ID: 1379658344058458182</p>
      </div>
    </div>
  );
}
