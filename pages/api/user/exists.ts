import apiWrapper, { NextApiRequestWrapper, ValidType } from '@root/helpers/apiWrapper';
import { UserModel } from '@root/models/mongoose';
import { NextApiResponse } from 'next';

export default apiWrapper({
  GET: {
    query: {
      name: ValidType('string', true),
    }
  }
}, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
  const { name } = req.query as { name: string };
  const userExists = await UserModel.exists({ name });

  return res.status(userExists ? 200 : 404).json({ exists: userExists });
});
