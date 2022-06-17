import Level from '../models/db/level';
import { LevelModel } from '../models/mongoose';

async function slugExists(slug: string): Promise<Level | null> {
  return await LevelModel.findOne({ slug: slug });
}

function slugify(str: string) {
  const slug = str
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .trim().replace(/\s+/g, '-');

  // return a dash for strings with no alphanumeric characters
  return slug === '' ? '-' : slug;
}

export default async function generateSlug(existingId: string | null, userName: string, levelName: string) {
  const og_slug = slugify(userName) + '/' + slugify(levelName);
  let slug = og_slug;
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
