import Level from './level';
import { Types } from 'mongoose';

// represents a document from the pathology.levelImages collection
interface LevelImage {
  _id: Types.ObjectId;
  image: Buffer;
  levelId: Types.ObjectId & Level;
  ts: number;
}

export default LevelImage;
