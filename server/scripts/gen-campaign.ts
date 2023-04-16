// run with ts-node --files server/scripts/gen-campaign.ts

import TileType from '@root/constants/tileType';
import dotenv from 'dotenv';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { LevelModel } from '../../models/mongoose';

dotenv.config();

async function genCampaign() {
  await dbConnect();
  const startTime = Date.now();
  const levels = await LevelModel.find(
    {
      isDeleted: { $ne: true },
      isDraft: false,
      leastMoves: {
        // least moves between 10 and 100
        $gte: 5,
        $lte: 100,
      },
      calc_reviews_count: {
        // at least 3 reviews
        $gte: 3,
      },
      calc_reviews_score_laplace: {
        // at least above 0.67 default
        $gt: 0.8,
      },
      'calc_playattempts_unique_users.10': {
        // the length of calc_playattempts_unique_users at least 10
        $exists: true,
      },
    }, {
      '_id': 1,
      'slug': 1,
      'leastMoves': 1,
      'width': 1,
      'height': 1,
      'data': 1,
      'calc_reviews_score_laplace': 1,
      'calc_playattempts_duration_sum': 1,
      'calc_stats_players_beaten': 1,
      'total_played': {
        $size: '$calc_playattempts_unique_users',
      },
      'totaltime_div_ppl_beat': {
        '$divide': [
          '$calc_playattempts_duration_sum', '$calc_stats_players_beaten'
        ]
      },
    }, { lean: true, sort: {
      'totaltime_div_ppl_beat': -1 // for some reason this isnt working
    } });
  const endTime = Date.now();
  const timeTaken = endTime - startTime;

  //console.log(`Generated ${levels.length} levels in ${timeTaken}ms`);
  function countUnique(str: string) {
    let count = 0;
    const unique: any = {};

    for (let j = 0; j < str.length; j++) {
      const s = str.charAt(j);

      if (s === TileType.Wall || s === TileType.Default || s === TileType.Start || s === TileType.End) {
        continue;
      }

      if (!unique[s] && s !== '\n') {
        unique[s] = true;
        count++;
      }
    }

    return count;
  }

  // const sortedLevels = levels.sort((a, b) => {
  //   if (Math.abs(a.totaltime_div_ppl_beat - b.totaltime_div_ppl_beat) < 10) {
  //     // if the difference in difficulty is less than 10, then use lowest step count
  //     // but only if the step count difference is larger than 4 steps
  //     if (Math.abs(a.leastMoves - b.leastMoves) > 4) {
  //       return a.leastMoves - b.leastMoves;
  //     }
  //     else {
  //       // if less than 4 steps than use the total unique players beaten. the more that have beaten it assume it is easier
  //       return a.total_played - b.total_played;
  //     }
  //   }
  //   else return a.totaltime_div_ppl_beat - b.totaltime_div_ppl_beat;
  // });

  const sortedLevels = levels.sort((a, b) => a.totaltime_div_ppl_beat - b.totaltime_div_ppl_beat);

  // output headers for row 1
  console.log('level\tleastMoves\ttime/pplbeat\ttotalBeaten\twidth*height\tdist block types\ttotal exits\tlaplace\ttotaltimeratio');

  for (let i = 0; i < Math.min(1000, sortedLevels.length); i++) {
    const curLevel: any = levels[i];
    // convert object to csv
    const uniq_block_types = countUnique(curLevel.data);

    const total_exits = curLevel.data.split('').filter((x: any) => x === TileType.End).length;
    const csv = `https://pathology.gg/level/${curLevel.slug}\t${curLevel.leastMoves}\t${curLevel.totaltime_div_ppl_beat}\t${curLevel.calc_stats_players_beaten}\t${curLevel.width * curLevel.height}\t${uniq_block_types}\t${total_exits}\t${curLevel.calc_reviews_score_laplace}\t${curLevel.totaltime_div_ppl_beat}`;

    console.log(csv);
  }

  await dbDisconnect();
}

genCampaign();
