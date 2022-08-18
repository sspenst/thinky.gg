import { Types } from 'mongoose';
import { EnrichedLevel } from '../../pages/search';
import Level from './level';
import User from './user';

// represents a document from the pathology.worlds collection
interface Collection {
  _id: Types.ObjectId;
  authorNote?: string;
  levels: Types.Array<Types.ObjectId & Level> | EnrichedLevel[];
  name: string;
  psychopathId?: number;
  userId?: Types.ObjectId & User;
}

export default Collection;
