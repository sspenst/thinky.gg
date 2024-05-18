import User from '@root/models/db/user';
import { NextApiRequest, NextApiResponse } from 'next';
import apiWrapper, { ValidType } from '../../../helpers/apiWrapper';
import cleanUser from '../../../lib/cleanUser';
import { UserModel } from '../../../models/mongoose';

export default apiWrapper({ GET: {
  query: {
    search: ValidType('string', true)
  }
} }, async (req: NextApiRequest, res: NextApiResponse) => {
  const search = req.query.search as string;
  const cleanedSearch = search.replace(/[^-a-zA-Z0-9_' ]/g, '.*');

  if (cleanedSearch.length === 0) {
    return res.status(200).json([]);
  }

  const users = await UserModel.find({
    name: {
      $regex: '^' + cleanedSearch,
      $options: 'i'
    },
  }, 'id name hideStatus last_visited_at avatarUpdatedAt', { limit: 5, sort: { last_visited_at: -1, name: 1 } }).lean<User[]>();

  users.map((user) => cleanUser(user));

  return res.status(200).json(users);
});
