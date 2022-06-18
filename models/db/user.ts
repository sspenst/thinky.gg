import { Types } from 'mongoose';

// represents a document from the pathology.users collection
interface User {
  _id: Types.ObjectId;
  calc_records: number;
  email: string;
  isOfficial: boolean;
  name: string;
  password?: string;
  psychopathId?: number;
  score: number;
  ts?: number;
}

export default User;
