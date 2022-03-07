import { ObjectId } from 'bson';
import UserModel from '../../../models/mongoose/userModel';
import dbConnect from '../../../lib/dbConnect';
import getTokenCookie from '../../../lib/getTokenCookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const { email, name, password } = req.body;
  
    await dbConnect();

    await UserModel.create({
      _id: new ObjectId(),
      email: email,
      name: name,
      password: password
    });

    res.setHeader('Set-Cookie', getTokenCookie(email))
      .status(200).json({ success: true });
  } catch(err) {
    res.status(500).json({
      error: 'Error signing up new user',
    });
  }
}
