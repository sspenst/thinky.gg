/* istanbul ignore file */

import Level from '@root/models/db/level';
import { ImageModel } from '@root/models/mongoose';
import { getGameFromId } from './getGameIdFromReq';
import { TimerUtil } from './getTs';
import { logger } from './logger';

export default async function genImage(lvl: Level) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  await ImageModel.deleteOne(
    { documentId: lvl._id },

  );
  const fetchUrl = process.env.GEN_IMAGE_URL; // includes a query parameter already so assume more than 1
  const game = getGameFromId(lvl.gameId);
  const baseUrl = game.baseUrl;

  const path = baseUrl + '/level-shim/' + lvl._id.toString() + '&random=' + Math.random(); // add random to avoid cloudflare caching
  const pathEncoded = path;
  const fullUrl = fetchUrl + '&url=' + pathEncoded;
  const query = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!query.ok) {
    logger.error(query.status + ' returned for ' + fullUrl);

    return;
  }

  // the response should be an image
  const buffer = await query.arrayBuffer();
  const bitmapBuffer = Buffer.from(buffer);

  await ImageModel.findOneAndUpdate(
    { documentId: lvl._id },
    {
      documentId: lvl._id,
      image: bitmapBuffer,
      ts: TimerUtil.getTs(),
    },
    {
      upsert: true,
    },
  );
}
