import { Types } from 'mongoose';

// represents a document from the pathology.users collection
export default interface User {
  _id: Types.ObjectId;
  email: string;
  isOfficial: boolean;
  isUniverse: boolean;
  name: string;
  password?: string;
  psychopathId?: number;
  score: number;
  ts?: number;
}
