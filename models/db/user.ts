import { Types } from 'mongoose';
import Role from '../../constants/role';

// represents a document from the pathology.users collection
interface User {
  _id: Types.ObjectId;
  avatarUpdatedAt?: number;
  calc_records: number;
  email: string;
  hideStatus?: boolean;
  last_visited_at?: number; // last time user visited website
  name: string;
  password?: string;
  psychopathId?: number;
  roles: Role[];
  score: number;
  ts?: number; // created timestamp
}

export function getProfileSlug(user: User) {
  return '/profile/' + user.name.toLowerCase();
}

export default User;
