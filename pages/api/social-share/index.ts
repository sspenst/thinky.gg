import AchievementCategory from '@root/constants/achievements/achievementCategory';
import { GameId } from '@root/constants/GameId';
import GraphType from '@root/constants/graphType';
import { ValidObjectId, ValidType } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { GraphTypeShareMetadata } from '@root/models/db/graphMetadata';
import { GraphModel, LevelModel } from '@root/models/mongoose';
import { NextApiResponse } from 'next';
import { queueRefreshAchievements } from '../internal-jobs/worker/queueFunctions';

export default withAuth(
  {
    POST: {
      body: {
        platform: ValidType('string'),
        levelId: ValidObjectId(),
      },
    },
  }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    if (req.method === 'POST') {
      const { platform, levelId } = req.body;

      // Validate platform
      const validPlatforms = ['X', 'Facebook', 'LinkedIn', 'Reddit', 'Telegram'];

      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform.' });
      }

      // Verify the level exists and is not draft
      const level = await LevelModel.findOne({
        _id: levelId,
        isDeleted: { $ne: true },
        isDraft: false,
      }, { _id: 1 }).lean();

      if (!level) {
        return res.status(404).json({ error: 'Level not found.' });
      }

      // Create social share record using Graph model
      const metadata: GraphTypeShareMetadata = {
        platform: platform as GraphTypeShareMetadata['platform'],
      };

      await GraphModel.create({
        source: req.user._id,
        sourceModel: 'User',
        target: levelId,
        targetModel: 'Level',
        type: GraphType.SHARE,
        metadata,
      });

      // Refresh achievements to check for social sharing achievement (always use THINKY)
      await queueRefreshAchievements(GameId.THINKY, req.user._id, [AchievementCategory.SOCIAL]);

      return res.status(200).json({
        success: true,
        platform,
      });
    }
  });
