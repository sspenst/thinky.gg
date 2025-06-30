import React from 'react';

interface ConnectionInfoProps {
  frameId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  userToken?: string;
  connectionInfo: any;
  authStatus: string;
}

export default function ConnectionInfo({
  frameId,
  channelId,
  guildId,
  userId,
  userToken,
  connectionInfo,
  authStatus
}: ConnectionInfoProps) {
  return (
    <div className='text-left text-xs bg-gray-800 rounded p-3 mb-4'>
      <p><strong>Frame ID:</strong> {frameId || 'discord-activity-frame'}</p>
      {channelId && <p><strong>Channel ID:</strong> {channelId}</p>}
      {guildId && <p><strong>Guild ID:</strong> {guildId}</p>}
      {userId && <p><strong>User ID:</strong> {userId}</p>}
      {userToken && <p><strong>User Token:</strong> {userToken.substring(0, 10)}...</p>}
      <p><strong>Timestamp:</strong> {connectionInfo.timestamp}</p>
      <p><strong>Auth Status:</strong> {authStatus}</p>
    </div>
  );
}
