import { LevelModel } from '../models/mongoose';

async function slugExists(slug:string) {
  return await LevelModel.findOne({ slug: slug });
}
export default async function generateSlug(userName: string, levelName: string) {

  let slug = levelName;

  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9 ]+/g, '');
  slug = slug.trim().replace(/\s+/g, '-');

  slug = userName.toLowerCase() + '/' + slug;
  const og_slug = slug;
  let i = 2;

  while (i < 100) {

    const exists = await slugExists(slug);

    if (!exists) {
      return slug;
    }

    slug = og_slug + '-' + i;
    i++;
  }

  throw new Error('Couldn\'t generate a unique slug');
}
