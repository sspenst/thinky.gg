import { Types } from 'mongoose';

interface Image {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  image: Buffer;
  ts: number;
}

export default Image;
