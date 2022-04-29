import User from '../models/db/user';
import jwt from 'jsonwebtoken';

export default function getResetPasswordToken(user: User) {
  return jwt.sign(
    { userId: user._id },
    `${user.ts}-${user.password}`,
    { expiresIn: '10m' }
  );
}
