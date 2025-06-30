# Discord Embedded Activities Integration

This document describes the Discord embedded activities integration for Thinky.gg.

## Overview

The integration allows Thinky.gg to be embedded as an activity within Discord, providing a seamless gaming experience for Discord users.

## Setup

### 1. Discord Application Configuration

- **Client ID**: `1379658344058458182` (hardcoded for now)
- **Application Type**: Embedded App
- **URL Mapping**: Configured to map Discord embedded app URLs to Thinky.gg

### 2. URL Mapping

According to Discord's documentation, the following URL mapping should be configured in your Discord application:

```
https://thinky.gg/discord-play?frame_id={frame_id}&channel_id={channel_id}&guild_id={guild_id}&user_id={user_id}&user_token={user_token}&session_id={session_id}&instance_id={instance_id}
```

### 3. Implementation Details

#### Pages

- **Home Page (`pages/index.tsx`)**: Detects Discord parameters and redirects to `/discord-play`
- **Discord Play Page (`pages/[subdomain]/discord-play/index.tsx`)**: Dedicated page for Discord embedded activities
- **Discord Activity Component (`components/discord/DiscordActivity.tsx`)**: React component that handles Discord integration

#### Parameters Handled

The following Discord parameters are supported:

- `frame_id`: Discord frame identifier
- `channel_id`: Discord channel ID
- `guild_id`: Discord guild (server) ID
- `user_id`: Discord user ID
- `user_token`: Discord user token
- `session_id`: Discord session ID
- `instance_id`: Discord instance ID

#### Middleware

The middleware (`middleware.ts`) has been updated to:
- Allow access to `/discord-play` without subdomain restrictions
- Handle Discord embedded app routing properly

## Testing

### Local Testing

You can test the Discord integration locally by visiting:

```
http://localhost:3000/discord-play?frame_id=test123&channel_id=456&guild_id=789&user_id=user123&user_token=token123
```

### Production Testing

In production, Discord will automatically pass the required parameters when the app is embedded.

## Discord SDK Integration

The `@discord/embedded-app-sdk` package is installed and available for use. The current implementation shows a basic connection status, but you can extend it to use the full SDK functionality.

### Available SDK Methods

```javascript
import { DiscordSDK } from '@discord/embedded-app-sdk';

// Initialize SDK
const sdk = new DiscordSDK(clientId, frameId);

// Available methods:
// - sdk.getTransfer()
// - sdk.close()
// - sdk.subscribe()
// - sdk.unsubscribe()
// - sdk.ready()
// - sdk.handshake()
// - sdk.addOnReadyListener()
```

## Security Considerations

- User tokens are handled securely and only displayed partially in the UI
- All Discord parameters are validated and sanitized
- The integration follows Discord's security best practices

## Future Enhancements

1. **Full SDK Integration**: Implement complete Discord SDK functionality
2. **User Authentication**: Link Discord users with Thinky.gg accounts
3. **Game Integration**: Allow Discord users to play Thinky games directly
4. **Real-time Features**: Implement real-time multiplayer features
5. **Activity Status**: Show user's game status in Discord

## Troubleshooting

### Common Issues

1. **Parameters Not Received**: Check Discord application configuration
2. **Redirect Issues**: Verify middleware configuration
3. **SDK Connection**: Check browser console for SDK errors

### Debug Information

The Discord activity component logs detailed information to the browser console, including:
- All received Discord parameters
- User agent information
- Connection timestamp
- URL information

## References

- [Discord Embedded App Documentation](https://discord.com/developers/docs/activities/building-an-activity)
- [Discord URL Mapping Guide](https://discord.com/developers/docs/activities/development-guides/local-development#url-mapping)
- [Discord Design Patterns](https://discord.com/developers/docs/activities/design-patterns) 