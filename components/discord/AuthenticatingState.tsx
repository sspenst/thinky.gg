import React from 'react';

export default function AuthenticatingState() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-blue-600 rounded-lg p-6 max-w-md text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4' />
        <h2 className='text-xl font-bold mb-2'>Authenticating...</h2>
        <p className='text-sm'>Verifying your Discord account</p>
        <p className='text-xs mt-2 text-gray-300'>Setting up your session</p>
      </div>
    </div>
  );
}
