import Head from 'next/head';
import { Game } from '@root/constants/Games';
import Level from '@root/models/db/level';

interface GameSchemaProps {
  game: Game;
  level?: Level;
  type?: 'Game' | 'VideoGame';
}

export default function GameSchema({ game, level, type = 'VideoGame' }: GameSchemaProps) {
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': type,
    name: game.displayName,
    description: game.seoDescription,
    url: game.baseUrl,
    image: `${game.baseUrl}${game.logoPng}`,
    author: {
      '@type': 'Organization',
      name: 'Thinky Games',
      url: game.baseUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'Thinky Games',
      url: game.baseUrl
    },
    applicationCategory: 'Game',
    applicationSubCategory: 'Puzzle Game',
    genre: ['Puzzle', 'Logic', 'Strategy'],
    playMode: 'SinglePlayer',
    gamePlatform: ['Web Browser', 'Desktop', 'Mobile'],
    operatingSystem: ['Any'],
    isAccessibleForFree: true,
    contentRating: 'E',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1'
    },
    offers: game.hasPro ? {
      '@type': 'Offer',
      name: 'Pro Subscription',
      category: 'Premium Features',
      eligibleRegion: 'Worldwide'
    } : undefined
  };

  const levelSchema = level ? {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${game.baseUrl}/level/${level.slug}`,
    name: level.name,
    description: `A challenging ${game.displayName} puzzle level`,
    creator: {
      '@type': 'Person',
      name: level.userId?.name || 'Anonymous'
    },
    dateCreated: level.ts ? new Date(level.ts * 1000).toISOString() : undefined,
    isPartOf: {
      '@type': 'VideoGame',
      name: game.displayName
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/PlayAction',
      userInteractionCount: level.calc_playattempts_unique_users || 0
    }
  } : null;

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(gameSchema)
        }}
      />
      {levelSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(levelSchema)
          }}
        />
      )}
    </Head>
  );
}