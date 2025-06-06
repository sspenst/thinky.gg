# PostHog Funnel Setup for Thinky.gg

This document outlines how to set up conversion funnels in PostHog to track OAuth and traditional signup conversion rates.

## Key Events Tracked (Backend)

All events are tracked server-side for maximum reliability and accuracy. We focus on actual outcomes rather than user attempts.

### Core Conversion Events

1. **User Registered** - Tracked in `/api/signup`
   - `registration_method`: 'email', 'oauth', or 'guest'
   - `oauth_provider`: 'discord' or 'google' (if OAuth)
   - `utm_source`: string
   - `game_id`: string

2. **User Logged In** - Tracked in `/api/login` and OAuth callbacks
   - `login_method`: 'email' or 'oauth'
   - `oauth_provider`: 'discord' or 'google' (if OAuth)

3. **OAuth Account Linked** - Tracked in OAuth callbacks
   - `provider`: 'discord' or 'google'
   - `provider_username`: string
   - `is_linking`: true

4. **Guest Account Converted** - Tracked in `/api/guest-convert`
   - `new_username`: string
   - `game_id`: string

## Automatic Tracking

- **Page Views**: Automatically tracked by PostHog
- **Feature Flags**: Native PostHog integration tracks which users see which features

## Funnel Examples

### 1. Registration Conversion Funnel
```
Page View → User Registered
```

Filter by:
- `registration_method` = 'oauth' vs 'email'
- `oauth_provider` to compare Discord vs Google
- `utm_source` for attribution analysis

### 2. OAuth vs Email Signup Comparison
```
User Registered (registration_method = 'oauth')
vs
User Registered (registration_method = 'email')
```

### 3. Guest Conversion Funnel
```
User Registered (registration_method = 'guest') → Guest Account Converted
```

### 4. OAuth Login Return Rate
```
User Registered (registration_method = 'oauth') → User Logged In (login_method = 'oauth')
```

### 5. Feature Flag Impact Analysis
```
User Registered
WHERE feature_flags->>'oauth-providers' = 'true'
vs
User Registered  
WHERE feature_flags->>'oauth-providers' = 'false'
```

## Sample Queries

### OAuth Conversion Rate
```sql
SELECT 
  oauth_provider,
  COUNT(*) as total_registrations
FROM events 
WHERE event = 'User Registered' 
  AND properties ->> 'registration_method' = 'oauth'
  AND timestamp >= '2024-01-01'
GROUP BY oauth_provider
```

### Guest to Full Account Conversion Rate
```sql
-- Guest registrations
SELECT COUNT(*) as guest_signups
FROM events 
WHERE event = 'User Registered' 
  AND properties ->> 'registration_method' = 'guest'
  AND timestamp >= '2024-01-01'

-- Guest conversions  
SELECT COUNT(*) as guest_conversions
FROM events 
WHERE event = 'Guest Account Converted'
  AND timestamp >= '2024-01-01'
```

### Feature Flag A/B Test Results
```sql
SELECT 
  feature_flags->>'oauth-providers' as oauth_enabled,
  COUNT(*) as registrations,
  COUNT(CASE WHEN properties->>'registration_method' = 'oauth' THEN 1 END) as oauth_registrations
FROM events e
WHERE event = 'User Registered'
  AND timestamp >= '2024-01-01'
GROUP BY feature_flags->>'oauth-providers'
```

## Dashboard Setup

1. **Registration Overview**
   - Total registrations by method (email, OAuth, guest)
   - OAuth provider breakdown
   - Daily/weekly trends

2. **OAuth Performance**
   - OAuth vs email conversion rates
   - Discord vs Google performance
   - OAuth account linking events

3. **Guest Conversion**
   - Guest signup to conversion rate
   - Time between guest signup and conversion
   - Guest conversion trends

4. **Feature Flag Impact**
   - Registration rates with/without OAuth enabled
   - A/B test results and statistical significance

## Key Metrics to Track

- **Registration Conversion Rate**: Page views → Registrations
- **OAuth Adoption Rate**: OAuth registrations / Total registrations  
- **Guest Conversion Rate**: Guest conversions / Guest registrations
- **Provider Performance**: Discord vs Google registration rates
- **Feature Flag Impact**: Registration lift with OAuth enabled
- **Return User Rate**: Users who log in after registering

This backend-focused approach provides reliable, actionable data for optimizing your conversion funnel and measuring the impact of OAuth integration. 