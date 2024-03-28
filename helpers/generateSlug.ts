import { GameId } from '@root/constants/GameId';
import { QueryOptions } from 'mongoose';
import Collection from '../models/db/collection';
import Level from '../models/db/level';
import { CollectionModel, LevelModel } from '../models/mongoose';

async function getLevelBySlug(gameId: GameId, slug: string, options?: QueryOptions): Promise<Level | null> {
  return await LevelModel.findOne({ slug: slug, gameId: gameId }, {}, options);
}

async function getCollectionBySlug(gameId: GameId, slug: string, options?: QueryOptions): Promise<Collection | null> {
  return await CollectionModel.findOne({ slug: slug, gameId: gameId }, {}, options);
}

// NB: with makeId(4) and 4 custom slug attempts, we have a 1 in 4.8e28 ((62^4)^4) chance of a not generating a slug
const SLUG_ID_LENGTH = 4;
const MAX_SLUGS_WITH_SAME_NAME = 5;

export class SlugUtil {
  static makeId(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result = result + characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
}

function slugify(str: string) {
  const slug = str
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .trim().replace(/\s+/g, '-');

  // return a dash for strings with no alphanumeric characters
  return slug === '' ? '-' : slug;
}

export async function generateCollectionSlug(
  gameId: GameId,
  userName: string,
  collectionName: string,
  existingCollectionId?: string,
  options?: QueryOptions,
) {
  const og_slug = slugify(userName) + '/' + slugify(collectionName);
  let slug = og_slug;
  let attempts = 0;

  while (attempts < MAX_SLUGS_WITH_SAME_NAME) {
    const collection = await getCollectionBySlug(gameId, slug, options);

    if (!collection) {
      return slug;
    }

    if (collection._id.toString() === existingCollectionId) {
      return slug;
    }

    slug = og_slug + '-' + SlugUtil.makeId(SLUG_ID_LENGTH);
    attempts++;
  }

  throw new Error('Couldn\'t generate a unique collection slug');
}

export async function generateLevelSlug(
  gameId: GameId,
  userName: string,
  levelName: string,
  existingLevelId?: string,
  options?: QueryOptions,
) {
  const og_slug = slugify(userName) + '/' + slugify(levelName);
  let slug = og_slug;
  let attempts = 0;

  while (attempts < MAX_SLUGS_WITH_SAME_NAME) {
    const level = await getLevelBySlug(gameId, slug, options);

    if (!level) {
      return slug;
    }

    if (level._id.toString() === existingLevelId) {
      return slug;
    }

    slug = og_slug + '-' + SlugUtil.makeId(SLUG_ID_LENGTH);
    attempts++;
  }

  throw new Error('Couldn\'t generate a unique level slug');
}
