import { Types } from 'mongoose';

// represents a document from the pathology.users collection
export default interface User {
  _id: Types.ObjectId;
  email: string;
  name: string;
  password?: string;
  score: number;
}
