import { NextApiResponse } from 'next';
import { ValidType } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import withAuth, { NextApiRequestWithAuth } from '../../../lib/withAuth';
import { UserModel } from '../../../models/mongoose';

export default withAuth({ GET: {
  query: {
    search: ValidType('string', true)
  }
} }, async (req: NextApiRequestWithAuth, res: NextApiResponse) => {
  const search = req.query.search as string;
  const cleanedSearch = search.replace(/[^-a-zA-Z0-9_' ]/g, '.*');

  if (cleanedSearch.length === 0) {
    return res.status(200).json([]);
  }

  const users = await UserModel.find({
    name: {
      $regex: '^' + cleanedSearch,
      $options: 'i'
    }
  }, 'id name hideStatus last_visited_at avatarUpdatedAt', { lean: true, limit: 5, sort: { name: 1 } });

  users.map((user) => cleanUser(user));

  return res.status(200).json(users);
});
