import Page from '@root/components/page/page';
import { AppContext } from '@root/contexts/appContext';
import { GetServerSidePropsContext } from 'next';
import React, { useContext, useEffect } from 'react';
import { DiscordActivity } from '../../../components/discord';

interface DiscordPlayProps {
  frameId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  userToken?: string;
  sessionId?: string;
  instanceId?: string;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { query } = context;

  // Extract Discord embedded app parameters
  const frameId = query.frame_id as string;
  const channelId = query.channel_id as string;
  const guildId = query.guild_id as string;
  const userId = query.user_id as string;
  const userToken = query.user_token as string;
  const sessionId = query.session_id as string;
  const instanceId = query.instance_id as string;

  // Only include props that have values (not undefined)
  const props: any = {};

  if (frameId) props.frameId = frameId;
  if (channelId) props.channelId = channelId;
  if (guildId) props.guildId = guildId;
  if (userId) props.userId = userId;
  if (userToken) props.userToken = userToken;
  if (sessionId) props.sessionId = sessionId;
  if (instanceId) props.instanceId = instanceId;

  return {
    props,
  };
}

export default function DiscordPlay({
  frameId,
  channelId,
  guildId,
  userId,
  userToken,
  sessionId,
  instanceId,
}: DiscordPlayProps) {
  return (
    <DiscordActivity
      frameId={frameId}
      channelId={channelId}
      guildId={guildId}
      userId={userId}
      userToken={userToken}
      sessionId={sessionId}
      instanceId={instanceId}
    />
  );
}
