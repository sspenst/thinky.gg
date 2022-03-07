import cookieOptions from '../../../helpers/cookieOptions';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', serialize('token', '', cookieOptions(true)))
    .status(200).json({ success: true });
}
