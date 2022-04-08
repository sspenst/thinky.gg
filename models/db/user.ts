import { Types } from 'mongoose';

// represents a document from the pathology.users collection
export default interface User {
  _id: Types.ObjectId;
  email: string;
  isCreator: boolean;
  isOfficial: boolean;
  name: string;
  password?: string;
  psychopathId?: number;
  score: number;
}
