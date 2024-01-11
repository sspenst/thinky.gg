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
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <!--We manually set the two URLs we know already-->
     <url>
       <loc>${URL_BASE}</loc>
     </url>
     <url>
       <loc>${URL_BASE}/search</loc>
     </url>
     <url>
       <loc>${URL_BASE}/signup</loc>
     </url>
     <url>
       <loc>${URL_BASE}/login</loc>
     </url>
     ${users
    .map(( user) => {
      return `
       <url>
           <loc>${`${URL_BASE}${getProfileSlug(user)}`}</loc>
       </url>
     `;
    })
    .join('')}
    ${levels
    .map(( level) => {
      return `
         <url>
             <loc>${`${URL_BASE}/level/${(level.slug)}`}</loc>
             <lastmod>${new Date(level.ts * 1000).toISOString()}</lastmod>
         </url>
       `;
    })
    .join('')}
    ${collections
    .map(( collection) => {
      return `
           <url>
               <loc>${`${URL_BASE}/collection/${(collection.slug)}`}</loc>
               <lastmod>${collection.updatedAt.toISOString()}</lastmod>
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
      UserModel.find({}, 'name').lean<User[]>(),
      LevelModel.find({ isDeleted: { $ne: true }, isDraft: false, gameId: gameId }, 'slug ts').lean<Level[]>(),
      CollectionModel.find({ isPrivate: { $ne: true }, gameId: gameId }, 'slug updatedAt').lean<Collection[]>()
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
