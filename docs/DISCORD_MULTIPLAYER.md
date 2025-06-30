# Discord Multiplayer Component

This document explains the Discord-optimized multiplayer component that provides a seamless multiplayer experience within Discord embedded activities.

## Overview

The Discord multiplayer component (`components/discord/SuccessState.tsx`) is a comprehensive multiplayer interface designed specifically for Discord embedded activities. It provides multiple states and features optimized for the Discord environment.

## Features

### 1. Multiple States
The component handles three main states:
- **Lobby**: Main multiplayer lobby where users can see matches and create new ones
- **In Match**: When a user is actively participating in a match
- **Viewing Match**: When viewing an active match (future enhancement)

### 2. Discord Room Integration
- Uses `instanceId` to create "rooms" for Discord channels
- Players in the same Discord channel can easily find and join each other's matches
- Matches created from Discord embeds are tagged with Discord metadata

### 3. Match Creation
- Reuses the existing `CreateMatchModal` component
- Automatically includes Discord metadata when creating matches
- Supports all existing match types (RushBullet, RushBlitz, RushRapid, RushClassical)

### 4. Real-time Updates
- Integrates with the existing multiplayer socket system
- Shows live updates of matches, players, and game states
- Displays online players and their ratings

## Generic Metadata System

The component uses a generic metadata system for extensible integrations:

```typescript
interface MultiplayerMatch {
  // ... existing fields
  metadata?: Record<string, any>;  // Generic metadata for any integration
}
```

### Discord Metadata Structure

When creating matches from Discord, the metadata is structured as:

```typescript
{
  metadata: {
    discord: {
      instanceId: string;      // Discord activity instance ID
      channelId: string;       // Discord channel ID
      guildId: string;         // Discord guild/server ID
      frameId: string;         // Discord activity frame ID
      sessionId: string;       // Discord session ID
    }
  }
}
```

This approach allows for:
- **Extensibility**: Easy to add new integrations (Twitch, YouTube, etc.)
- **Flexibility**: Can store any additional data needed
- **Future-proofing**: No schema changes needed for new platforms

## Usage

### For Discord Embedded Activities

1. **Authentication**: Users authenticate through Discord OAuth
2. **Room Creation**: The component uses the `instanceId` to create a "room" for the Discord channel
3. **Match Creation**: Users can create matches that are automatically tagged with Discord metadata
4. **Match Discovery**: Players in the same Discord channel can easily find and join matches

### API Integration

The match creation API (`/api/match`) accepts generic metadata:

```typescript
POST /api/match
{
  "type": "RushBullet",
  "private": false,
  "rated": true,
  "metadata": {
    "discord": {
      "instanceId": "discord-instance-id",
      "channelId": "discord-channel-id", 
      "guildId": "discord-guild-id",
      "frameId": "discord-frame-id",
      "sessionId": "discord-session-id"
    }
  }
}
```

### For Other Integrations

The same system can be used for other platforms:

```typescript
// Twitch integration example
{
  "metadata": {
    "twitch": {
      "channelId": "twitch-channel-id",
      "streamId": "twitch-stream-id"
    }
  }
}

// YouTube integration example
{
  "metadata": {
    "youtube": {
      "videoId": "youtube-video-id",
      "liveChatId": "youtube-live-chat-id"
    }
  }
}
```

## Discord Activity Parameters

The component accepts these Discord activity parameters:

- `frameId`: Discord activity frame ID
- `channelId`: Discord channel ID
- `guildId`: Discord guild/server ID
- `userId`: Discord user ID
- `userToken`: Discord user token
- `sessionId`: Discord session ID
- `instanceId`: Discord activity instance ID (used for room creation)

## Best Practices

### For Discord Multiplayer Experience

1. **Instance-based Rooms**: Use `instanceId` to group players from the same Discord channel
2. **Quick Match Creation**: Make it easy for users to create matches with one click
3. **Real-time Updates**: Provide live updates of match status and player activity
4. **Discord Integration**: Leverage Discord's social features for match discovery

### For Generic Metadata System

1. **Namespacing**: Always namespace metadata by platform (e.g., `discord`, `twitch`, `youtube`)
2. **Validation**: Validate metadata structure on the server side
3. **Documentation**: Document the expected metadata structure for each integration
4. **Backward Compatibility**: Ensure metadata changes don't break existing functionality

### Security Considerations

1. **Token Validation**: Always validate Discord tokens on the server side
2. **User Authentication**: Ensure users are properly authenticated before allowing match creation
3. **Rate Limiting**: Implement rate limiting for match creation and joining
4. **Metadata Validation**: Validate metadata structure and content

## Future Enhancements

1. **Voice Channel Integration**: Automatically create matches for Discord voice channels
2. **Discord Bot Integration**: Add Discord bot commands for match management
3. **Cross-platform Play**: Allow matches between Discord and web users
4. **Tournament Support**: Add support for Discord-based tournaments
5. **Multi-platform Support**: Extend to other platforms using the generic metadata system

## References

- [Discord Activities Documentation](https://discord.com/developers/docs/activities/development-guides/multiplayer-experience)
- [Discord Embedded App SDK](https://discord.com/developers/docs/embedded-app-sdk) 