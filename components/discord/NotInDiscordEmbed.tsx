import React, { useEffect, useState } from 'react';

export default function NotInDiscordEmbed() {
  const [currentUrl, setCurrentUrl] = useState<string>('Loading...');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    setCurrentUrl(window.location.href);
  }, []);

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4'>
      <div className='bg-yellow-600 rounded-lg p-6 max-w-md text-center'>
        <div className='w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4'>
          <svg className='w-6 h-6 text-yellow-600' fill='currentColor' viewBox='0 0 24 24'>
            <path d='M12 2C6.48 2 6.48 12 12 12s10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
          </svg>
        </div>
        <h2 className='text-xl font-bold mb-2'>Discord Activity Page</h2>
        <p className='text-sm mb-4'>This page is designed for Discord embedded activities</p>
        <div className='text-left text-xs bg-gray-800 rounded p-3 mb-4'>
          <p><strong>Status:</strong> Not in Discord embed</p>
          <p><strong>Expected URL:</strong> Should contain Discord parameters</p>
          <p><strong>Client ID:</strong> 1379658344058458182</p>
        </div>
        
        <p className='text-xs text-gray-300'>
          This page will show different content when accessed through Discord
        </p>
        <p className='text-xs text-gray-300 mt-2'>
          Current URL: {currentUrl}
        </p>
      </div>
    </div>
  );
}
