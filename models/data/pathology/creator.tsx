import { Types } from 'mongoose';

// represents a document from the pathology.creators collection
export default interface Creator {
  _id: Types.ObjectId;
  name: string;
  psychopathId?: number;
}
