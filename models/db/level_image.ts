import Level from './level';
import { Types } from 'mongoose';

// represents a document from the pathology.levels collection
interface LevelImage {
  _id: Types.ObjectId;
  ts: number;
  levelId: Types.ObjectId & Level;
  image: Buffer;
}

export default LevelImage;
