/* istanbul ignore file */

import Level from '@root/models/db/level';
import { ImageModel } from '@root/models/mongoose';
import getPngDataServer from './getPngDataServer';
import { TimerUtil } from './getTs';

export default async function genLevelImage(lvl: Level) {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  await ImageModel.deleteOne({ documentId: lvl._id });

  const buffer = await getPngDataServer(lvl.gameId, lvl);

  await ImageModel.findOneAndUpdate(
    {
      documentId: lvl._id,
    },
    {
      documentId: lvl._id,
      image: buffer,
      ts: TimerUtil.getTs(),
    },
    {
      upsert: true,
    },
  );
}
