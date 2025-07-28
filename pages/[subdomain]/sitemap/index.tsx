/** Warning, when we get to a sitemap greater than 50MB we'll need to split up the sitemap
 * as of 10.24.2022 we are at around 78kb so we are good for a while
*/
import { GameId } from '@root/constants/GameId';
import { getGameFromId, getGameIdFromReq } from '@root/helpers/getGameIdFromReq';
import { GetServerSidePropsContext } from 'next';
import getProfileSlug from '../../../helpers/getProfileSlug';
import { logger } from '../../../helpers/logger';
import dbConnect from '../../../lib/dbConnect';
import Collection from '../../../models/db/collection';
import Level from '../../../models/db/level';
import User from '../../../models/db/user';
import { CollectionModel, LevelModel, UserModel } from '../../../models/mongoose';

function generateSiteMap(gameId: GameId, users: User[], levels: Level[], collections: Collection[]) {
  const game = getGameFromId(gameId);
  const URL_BASE = game.baseUrl;

  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
           xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
     <!--Core pages with high priority-->
     <url>
       <loc>${URL_BASE}</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${URL_BASE}/search</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>0.8</priority>
     </url>
     <url>
       <loc>${URL_BASE}/leaderboards</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>0.7</priority>
     </url>
     <url>
       <loc>${URL_BASE}/level-of-the-day</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>0.9</priority>
     </url>
     ${!game.disableCampaign ? `
     <url>
       <loc>${URL_BASE}/campaigns</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>weekly</changefreq>
       <priority>0.8</priority>
     </url>` : ''}
     ${!game.disableRanked ? `
     <url>
       <loc>${URL_BASE}/ranked</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <changefreq>daily</changefreq>
       <priority>0.7</priority>
     </url>` : ''}
     <!--User profiles-->
     ${users
    .map(( user) => {
      return `
       <url>
           <loc>${`${URL_BASE}${getProfileSlug(user)}`}</loc>
           <lastmod>${user.last_visited_at ? new Date(user.last_visited_at).toISOString() : new Date().toISOString()}</lastmod>
           <changefreq>weekly</changefreq>
           <priority>0.5</priority>
       </url>
     `;
    })
    .join('')}
    <!--Puzzle levels with enhanced metadata-->
    ${levels
    .map(( level) => {
      const priority = level.calc_playattempts_unique_users > 100 ? '0.8' : 
                      level.calc_playattempts_unique_users > 50 ? '0.7' : '0.6';
      const changefreq = level.calc_playattempts_unique_users > 100 ? 'weekly' : 'monthly';
      
      return `
         <url>
             <loc>${`${URL_BASE}/level/${(level.slug)}`}</loc>
             <lastmod>${new Date(level.ts * 1000).toISOString()}</lastmod>
             <changefreq>${changefreq}</changefreq>
             <priority>${priority}</priority>
             <image:image>
               <image:loc>${URL_BASE}${game.logoPng}</image:loc>
               <image:title>${level.name} - ${game.displayName} Puzzle</image:title>
               <image:caption>A challenging puzzle level in ${game.displayName}</image:caption>
             </image:image>
         </url>
       `;
    })
    .join('')}
    <!--Collections with metadata-->
    ${collections
    .map(( collection) => {
      const priority = collection.levels && collection.levels.length > 10 ? '0.7' : '0.6';
      
      return `
           <url>
               <loc>${`${URL_BASE}/collection/${(collection.slug)}`}</loc>
               <lastmod>${collection.updatedAt.toISOString()}</lastmod>
               <changefreq>monthly</changefreq>
               <priority>${priority}</priority>
               <image:image>
                 <image:loc>${URL_BASE}${game.logoPng}</image:loc>
                 <image:title>${collection.name} - ${game.displayName} Collection</image:title>
                 <image:caption>A curated collection of ${game.displayName} puzzle levels</image:caption>
               </image:image>
           </url>
         `;
    })
    .join('')}
   </urlset>
 `;
}

/* istanbul ignore next */
export default function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  if (!process.env.SITEMAP_PRIV_KEY || context.query.key !== process.env.SITEMAP_PRIV_KEY) {
    return {
      notFound: true,
    };
  }

  await dbConnect();

  const gameId = getGameIdFromReq(context.req);

  try {
    const [allUsers, allLevels, allCollections] = await Promise.all([
      UserModel.find({}, 'name last_visited_at').lean<User[]>(),
      LevelModel.find({ 
        isDeleted: { $ne: true }, 
        isDraft: false, 
        gameId: gameId 
      }, 'slug ts name calc_playattempts_unique_users').lean<Level[]>(),
      CollectionModel.find({ 
        isPrivate: { $ne: true }, 
        gameId: gameId 
      }, 'slug updatedAt name levels').lean<Collection[]>()
    ]);

    const res = context.res;
    // We generate the XML sitemap with the posts data
    const sitemap = generateSiteMap(gameId, allUsers, allLevels, allCollections);

    res.statusCode = 200;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-control', 'stale-while-revalidate, s-maxage=3600');

    // we send the XML to the browser
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (e) {
    logger.error(e);

    //return 500
    const res = context.res;

    res.statusCode = 500;

    return {
      props: { error: e },
    };
  }
}
