import Level from '../models/db/level';
import User from '../models/db/user';
import { LevelModel } from '../models/mongoose';

async function getLevelBySlug(slug: string): Promise<Level | null> {
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

export async function generateSlug(userName: string, levelName: string, existingLevelId?: string) {
  const og_slug = slugify(userName) + '/' + slugify(levelName);
  let slug = og_slug;
  let i = 2;

  while (i < 100) {
    const level = await getLevelBySlug(slug);

    if (!level) {
      return slug;
    }

    if (level._id.toString() === existingLevelId) {
      return slug;
    }

    slug = og_slug + '-' + i;
    i++;
  }

  throw new Error('Couldn\'t generate a unique slug');
}

export function getProfileSlug(user: User) {
  return '/profile/' + user.name.toLowerCase();
}
