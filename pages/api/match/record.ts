import {
  ValidObjectId
} from '@root/helpers/apiWrapper';
import { getMultiplayerRecords } from '@root/helpers/multiplayerServerHelperFunctions';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';

export default withAuth(
  {
    GET: {
      query: {
        player: ValidObjectId(false),
        compareUser: ValidObjectId(false),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { player, compareUser } = req.query;

    const record = await getMultiplayerRecords(
      new Types.ObjectId(player as string),
      compareUser ? new Types.ObjectId(compareUser as string) : undefined
    );

    res.status(200).json(record);
  }
);
