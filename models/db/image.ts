import { Types } from 'mongoose';

// represents a document from the pathology.images collection
interface Image {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  image: Buffer;
  ts: number;
}

export default Image;
