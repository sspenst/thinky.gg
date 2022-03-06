import { Types } from 'mongoose';

// represents a document from the pathology.packs collection
export default interface Pack {
  _id: Types.ObjectId;
  creatorId: Types.ObjectId;
  name: string;
  psychopathId: number | undefined;
}
