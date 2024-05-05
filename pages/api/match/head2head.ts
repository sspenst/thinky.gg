import { ValidCommaSeparated, ValidObjectId } from '@root/helpers/apiWrapper';
import withAuth, { NextApiRequestWithAuth } from '@root/lib/withAuth';
import { Types } from 'mongoose';
import { NextApiResponse } from 'next';
import { getHeadToHeadMultiplayerRecord } from './search';

export default withAuth(
  {
    GET: {
      query: {
        players: ValidCommaSeparated(false, ValidObjectId(false)),
      },
    },
  },
  async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
    const { players } = req.query;
    const playersMap = ((players as string)?.split(','))?.map((id: string) => new Types.ObjectId(id.toString()));
    const record = await getHeadToHeadMultiplayerRecord(req.gameId, playersMap[0], playersMap[1]);

    res.status(200).json(record);
  }
);
