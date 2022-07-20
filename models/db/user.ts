import { Types } from 'mongoose';

// represents a document from the pathology.users collection
interface User {
  _id: Types.ObjectId;
  avatar?: string; // NB: populated in api/user
  calc_records: number;
  email: string;
  isOfficial: boolean;
  last_visited_at?: number; // last time user visited website
  name: string;
  password?: string;
  psychopathId?: number;
  score: number;
  ts?: number; // created timestamp
}

export default User;
