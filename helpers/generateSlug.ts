import Level from '../models/db/level';
import { LevelModel } from '../models/mongoose';

async function slugExists(slug:string):Promise<Level | null> {
  return await LevelModel.findOne({ slug: slug });
}

export default async function generateSlug(existingId:string | null, userName: string, levelName: string) {
  let slug = levelName;

  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9 ]+/g, '');
  slug = slug.trim().replace(/\s+/g, '-');

  // handle level names that have no alphanumeric characters
  if (slug === '') {
    slug = '-';
  }

  slug = userName.toLowerCase() + '/' + slug;

  const og_slug = slug;
  let i = 2;

  while (i < 100) {
    const exists = await slugExists(slug);

    if (!exists) {
      return slug;
    }

    if (exists._id.toString() === existingId) {
      return slug;
    }

    slug = og_slug + '-' + i;

    i++;
  }

  throw new Error('Couldn\'t generate a unique slug');
}
