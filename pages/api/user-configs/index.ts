import withAuth from '@root/lib/withAuth';
import UserConfig from '@root/models/db/userConfig';
import { UserConfigModel } from '@root/models/mongoose';

export default withAuth({
  // NB: GET API currently unused - UserConfig returned through /api/user
  GET: {}
}, async (req, res) => {
  const userConfigs = await UserConfigModel.find({ userId: req.user._id }).lean<UserConfig[]>();
  // convert to a map with gameId as key
  const userConfigsMap = userConfigs.reduce((acc, userConfig) => {
    acc[userConfig.gameId] = userConfig;

    return acc;
  }
  , {} as { [gameId: string]: UserConfig });

  // return userConfigsMap;
  return res.status(200).json(userConfigsMap);
});
