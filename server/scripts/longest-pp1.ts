// run with ts-node --files server/scripts/longest-pp1.ts
// import dotenv
import dotenv from 'dotenv';
import dbConnect from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';

'use strict';

dotenv.config();

// get command line arguments. check for existence of --levels and --users
async function init() {
  const mustNotContain = '56-9A-J';
  const mustNotContainRegex = `(?!.*[${mustNotContain}])`;

  console.log('connecting to db...');
  await dbConnect();
  console.log('connected');

  for (let i = 2; i <= 30; i++) {
    const level = await LevelModel.findOne({ isDraft: false, data: { $regex: new RegExp(`^(${mustNotContainRegex}[0-9A-J\n]+)$`, 'g') }, width: { $lte: i }, height: { $lte: i } }, 'slug leastMoves', { sort: { leastMoves: -1 } });

    console.log(`${i}x${i} - ${level.leastMoves}: https://thinky.gg/level/${level.slug}`);
  }

  return;
}

init();
