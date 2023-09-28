import { Types } from 'mongoose';
import Collection, { EnrichedCollection } from './collection';

interface Campaign {
  _id: Types.ObjectId;
  authorNote?: string;
  collections: Types.Array<Types.ObjectId & Collection> | EnrichedCollection[];
  collectionsPopulated?: Types.Array<Types.ObjectId & Collection> | EnrichedCollection[]; // virtual
  name: string;
  slug: string;
}

export interface EnrichedCampaign extends Campaign {
  levelCount: number;
  userSolvedCount: number;
}

export default Campaign;
