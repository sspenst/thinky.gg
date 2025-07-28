import { NextSeo, NextSeoProps } from 'next-seo';
import { Game } from '@root/constants/Games';
import Level from '@root/models/db/level';
import User from '@root/models/db/user';

interface GamingSEOProps extends Partial<NextSeoProps> {
  game: Game;
  level?: Level;
  user?: User;
  pageType?: 'homepage' | 'level' | 'collection' | 'leaderboard' | 'profile';
  playCount?: number;
  rating?: number;
  difficulty?: string;
}

const GamingSEO = ({
  game,
  level,
  user,
  pageType = 'homepage',
  playCount,
  rating,
  difficulty,
  ...nextSeoProps
}: GamingSEOProps) => {
  const generateTitle = () => {
    switch (pageType) {
      case 'level':
        return `${level?.name || 'Puzzle Level'} - ${game.displayName} | Free Online Puzzle Game`;
      case 'profile':
        return `${user?.name || 'Player'}'s Profile - ${game.displayName} | Puzzle Game Stats`;
      case 'leaderboard':
        return `Leaderboard - ${game.displayName} | Top Puzzle Game Players`;
      case 'collection':
        return `Puzzle Collection - ${game.displayName} | User-Created Levels`;
      default:
        return `${game.seoTitle} | Free Online Puzzle Game - Brain Training Games`;
    }
  };

  const generateDescription = () => {
    if (level) {
      const stats = [];
      if (playCount) stats.push(`${playCount} players`);
      if (difficulty) stats.push(`${difficulty} difficulty`);
      if (rating) stats.push(`${rating}/5 rating`);
      
      const statsText = stats.length > 0 ? ` (${stats.join(', ')})` : '';
      return `Play "${level.name}" - a challenging ${game.displayName.toLowerCase()} puzzle level${statsText}. ${game.seoDescription}`;
    }
    
    if (pageType === 'profile' && user) {
      return `View ${user.name}'s ${game.displayName} profile, stats, and created levels. Join the puzzle gaming community!`;
    }
    
    return `${game.seoDescription} Play free brain training puzzle games online. Challenge yourself with logic puzzles, strategy games, and mind-bending challenges.`;
  };

  const generateKeywords = () => {
    const baseKeywords = [
      'puzzle games',
      'brain training',
      'logic puzzles',
      'strategy games',
      'online games',
      'free games',
      'mind games',
      'puzzle solving',
      game.displayName.toLowerCase()
    ];

    if (level) {
      baseKeywords.push('level editor', 'user generated content', 'puzzle level');
    }

    if (pageType === 'leaderboard') {
      baseKeywords.push('leaderboard', 'high scores', 'puzzle rankings');
    }

    return baseKeywords.join(', ');
  };

  const seoProps: NextSeoProps = {
    title: generateTitle(),
    description: generateDescription(),
    canonical: level ? `${game.baseUrl}/level/${level.slug}` : game.baseUrl,
    openGraph: {
      title: generateTitle(),
      description: generateDescription(),
      url: level ? `${game.baseUrl}/level/${level.slug}` : game.baseUrl,
      type: 'website',
      site_name: game.displayName,
      images: [
        {
          url: `${game.baseUrl}${game.logoPng}`,
          width: 512,
          height: 512,
          alt: `${game.displayName} - Puzzle Game`,
          type: 'image/png',
        }
      ],
      locale: 'en_US',
    },
    twitter: {
      handle: '@thinkygg',
      site: '@thinkygg',
      cardType: 'summary_large_image',
    },
    additionalMetaTags: [
      {
        name: 'keywords',
        content: generateKeywords(),
      },
      {
        name: 'author',
        content: level?.userId?.name || 'Thinky Games',
      },
      {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
      {
        name: 'theme-color',
        content: '#13033d',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'application-name',
        content: game.displayName,
      },
      {
        name: 'msapplication-TileColor',
        content: '#13033d',
      },
      // Gaming-specific meta tags
      {
        property: 'og:type',
        content: 'game',
      },
      {
        property: 'game:category',
        content: 'Puzzle',
      },
      {
        property: 'game:genre',
        content: 'Logic, Strategy, Brain Training',
      },
      {
        property: 'game:platform',
        content: 'Web, Mobile, Desktop',
      },
      {
        property: 'game:rating',
        content: rating?.toString() || '4.5',
      }
    ],
    additionalLinkTags: [
      {
        rel: 'icon',
        href: game.favicon,
        type: 'image/svg+xml',
      },
      {
        rel: 'apple-touch-icon',
        href: game.logoPng,
        sizes: '180x180',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'dns-prefetch',
        href: 'https://www.google-analytics.com',
      }
    ],
    ...nextSeoProps,
  };

  return <NextSeo {...seoProps} />;
};

export default GamingSEO;