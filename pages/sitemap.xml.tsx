/** Warning, when we get to a sitemap greater than 50MB we'll need to split up the sitemap
 * as of 10.24.2022 we are at around 78kb so we are good for a while
*/
import { GetServerSidePropsContext } from 'next';
import getProfileSlug from '../helpers/getProfileSlug';
import { logger } from '../helpers/logger';
import dbConnect from '../lib/dbConnect';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import User from '../models/db/user';
import { CollectionModel, LevelModel, UserModel } from '../models/mongoose';

const URL_BASE = 'https://pathology.gg';

function generateSiteMap(users: User[], levels: Level[], collections: Collection[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <!--We manually set the two URLs we know already-->
     <url>
       <loc>https://pathology.gg</loc>
     </url>
     <url>
       <loc>https://pathology.gg/search</loc>
     </url>
     <url>
       <loc>https://pathology.gg/signup</loc>
     </url>
     <url>
       <loc>https://pathology.gg/login</loc>
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

  try {
    const allUsers = await UserModel.find({}, 'name', { lean: true });
    const allLevels = await LevelModel.find({ isDraft: false }, 'slug ts', { lean: true });
    const allCollections = await CollectionModel.find({ }, 'slug updatedAt', { lean: true });

    const res = context.res;
    // We generate the XML sitemap with the posts data
    const sitemap = generateSiteMap(allUsers, allLevels, allCollections);

    res.statusCode = 200;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-control', 'stale-while-revalidate, s-maxage=3600');

    // we send the XML to the browser
    res.write(sitemap);
    res.end();

    return {
      props: {},
    };
  } catch (e){
    logger.error(e);

    //return 500
    const res = context.res;

    res.statusCode = 500;

    return {
      props: { error: e },
    };
  }
}
