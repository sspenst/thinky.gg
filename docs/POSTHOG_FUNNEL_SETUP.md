# PostHog Funnel Setup for Thinky.gg

This document outlines how to set up conversion funnels in PostHog to track OAuth and traditional signup conversion rates.

## Key Events Tracked (Backend)

All events are tracked server-side for maximum reliability and accuracy. We focus on actual outcomes rather than user attempts.

### Core Conversion Events

1. **User Registered** - Tracked in `/api/signup`
   - `registration_method`: 'email', 'oauth', or 'guest'
   - `oauth_provider`: 'discord' or 'google' (if OAuth)
   - `email_confirmation_required`: boolean
   - `username_length`: number
   - `email_domain`: string
   - `utm_source`: string
   - `game_id`: string

2. **User Logged In** - Tracked in `/api/login` and OAuth callbacks
   - `login_method`: 'email' or 'oauth'
   - `oauth_provider`: 'discord' or 'google' (if OAuth)

3. **OAuth Account Linked** - Tracked in OAuth callback endpoints
   - `provider`: 'discord' or 'google'
   - `provider_username`: string
   - `is_linking`: true (vs. registration)

## Funnel Setup Instructions

### 1. Registration Conversion Funnel

**Purpose**: Track conversion from page views to successful account creation

**Steps**:
1. **Step 1**: `$pageview` on `/signup`
2. **Step 2**: `User Registered` with any `registration_method`

**Breakdown by**: `registration_method`

**Key Metrics**:
- Overall signup conversion rate
- OAuth vs email signup preferences
- Guest account creation rate

### 2. OAuth vs Email Registration Comparison

**Purpose**: Compare conversion rates between OAuth and traditional email signup

Create separate funnels:

**OAuth Funnel**:
1. `$pageview` on `/signup`
2. `User Registered` where `registration_method = 'oauth'`

**Email Funnel**:
1. `$pageview` on `/signup` 
2. `User Registered` where `registration_method = 'email'`

### 3. Login Method Analysis

**Purpose**: Track login method preferences and success rates

**Funnel**:
1. `$pageview` on `/login`
2. `User Logged In` with any `login_method`

**Breakdown by**: `login_method`

### 4. OAuth Account Linking Funnel

**Purpose**: Track how many users link OAuth accounts after registration

**Funnel**:
1. `$pageview` on `/settings`
2. `OAuth Account Linked`

**Breakdown by**: `provider`

## Feature Flag Integration

Use PostHog's native feature flag filtering for A/B testing:

```sql
-- Example: Filter events by oauth-providers feature flag
SELECT * FROM events 
WHERE event = 'User Registered' 
AND feature_flags->>'oauth-providers' = 'true'
```

## Sample Queries

### Registration Method Distribution
```sql
SELECT 
    properties.registration_method,
    count(*) as registrations
FROM events 
WHERE event = 'User Registered'
    AND timestamp >= now() - interval '30 days'
GROUP BY properties.registration_method
```

### OAuth Provider Popularity
```sql
SELECT 
    properties.oauth_provider,
    count(*) as registrations
FROM events 
WHERE event = 'User Registered'
    AND properties.registration_method = 'oauth'
    AND timestamp >= now() - interval '30 days'
GROUP BY properties.oauth_provider
```

### Conversion Rate by UTM Source
```sql
SELECT 
    properties.utm_source,
    count(*) as registrations,
    count(*) * 100.0 / sum(count(*)) over() as percentage
FROM events 
WHERE event = 'User Registered'
    AND timestamp >= now() - interval '30 days'
GROUP BY properties.utm_source
ORDER BY registrations DESC
```

## Dashboard Recommendations

### Key Metrics Dashboard
- Total registrations (last 7/30 days)
- Registration method breakdown (pie chart)
- OAuth provider distribution
- Login method preferences
- Account linking rates

### Conversion Funnel Dashboard
- Signup page views → Registrations
- OAuth signup conversion rate
- Email signup conversion rate
- Login success rates

### A/B Testing Dashboard
- Registration rates with/without OAuth (using feature flags)
- Conversion comparison by feature flag status
- User engagement by registration method

## Benefits of Backend Tracking

1. **Reliability**: Cannot be blocked by ad blockers or privacy tools
2. **Accuracy**: Tracks actual outcomes, not just attempts
3. **Privacy**: Server-side tracking is less intrusive
4. **Simplicity**: Fewer events to manage and analyze
5. **Data Quality**: Consistent event structure and timing

## Notes

- Page views are automatically tracked by PostHog
- All conversion events include user identification for proper attribution
- Feature flag states are automatically included in user profiles
- Server-side tracking ensures data consistency across sessions 