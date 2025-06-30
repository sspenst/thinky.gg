/**
 * Discord metadata utilities for the generic metadata system
 */

export interface DiscordMetadata {
  instanceId?: string;
  channelId?: string;
  guildId?: string;
  frameId?: string;
  sessionId?: string;
  userId?: string;
  userToken?: string;
}

export interface MatchMetadata {
  discord?: DiscordMetadata;
  [key: string]: any; // Allow other platform metadata
}

/**
 * Extract Discord metadata from match metadata
 */
export function getDiscordMetadata(matchMetadata?: Record<string, any>): DiscordMetadata | undefined {
  return matchMetadata?.discord;
}

/**
 * Check if a match was created from Discord
 */
export function isDiscordMatch(matchMetadata?: Record<string, any>): boolean {
  return !!getDiscordMetadata(matchMetadata);
}

/**
 * Check if a match belongs to a specific Discord instance
 */
export function isDiscordInstanceMatch(matchMetadata?: Record<string, any>, instanceId?: string): boolean {
  if (!instanceId) return false;
  const discordMeta = getDiscordMetadata(matchMetadata);

  return discordMeta?.instanceId === instanceId;
}

/**
 * Check if a match belongs to a specific Discord channel
 */
export function isDiscordChannelMatch(matchMetadata?: Record<string, any>, channelId?: string): boolean {
  if (!channelId) return false;
  const discordMeta = getDiscordMetadata(matchMetadata);

  return discordMeta?.channelId === channelId;
}

/**
 * Create Discord metadata object from Discord activity parameters
 */
export function createDiscordMetadata(params: {
  instanceId?: string;
  channelId?: string;
  guildId?: string;
  frameId?: string;
  sessionId?: string;
  userId?: string;
  userToken?: string;
}): DiscordMetadata {
  const metadata: DiscordMetadata = {};

  if (params.instanceId) metadata.instanceId = params.instanceId;
  if (params.channelId) metadata.channelId = params.channelId;
  if (params.guildId) metadata.guildId = params.guildId;
  if (params.frameId) metadata.frameId = params.frameId;
  if (params.sessionId) metadata.sessionId = params.sessionId;
  if (params.userId) metadata.userId = params.userId;
  if (params.userToken) metadata.userToken = params.userToken;

  return metadata;
}

/**
 * Create match metadata with Discord information
 */
export function createMatchMetadata(discordParams: {
  instanceId?: string;
  channelId?: string;
  guildId?: string;
  frameId?: string;
  sessionId?: string;
  userId?: string;
  userToken?: string;
}): MatchMetadata | undefined {
  const discordMetadata = createDiscordMetadata(discordParams);

  // Only return metadata if we have Discord data
  if (Object.keys(discordMetadata).length === 0) {
    return undefined;
  }

  return {
    discord: discordMetadata
  };
}

/**
 * Filter matches by Discord room (instanceId or channelId)
 */
export function filterDiscordRoomMatches(
  matches: any[],
  instanceId?: string,
  channelId?: string
): any[] {
  return matches.filter(match => {
    const discordMeta = getDiscordMetadata(match.metadata);

    // If we have instanceId, filter by it
    if (instanceId && discordMeta?.instanceId === instanceId) {
      return true;
    }

    // If we have channelId, filter by it
    if (channelId && discordMeta?.channelId === channelId) {
      return true;
    }

    // If no Discord metadata, include in room (fallback)
    if (!discordMeta) {
      return true;
    }

    return false;
  });
}
