import GraphType from '../../constants/graphType';
import Collection from './collection';
import { GraphTypeShareMetadata } from './graphMetadata';
import Level from './level';
import User from './user';

type GraphMetadata = {
  [GraphType.SHARE]: GraphTypeShareMetadata;
  [GraphType.FOLLOW]?: never;
  [GraphType.BLOCK]?: never;
};

interface Graph {
  createdAt: Date;
  updatedAt: Date;
  source: User;
  sourceModel: string;
  target: User | Collection | Level;
  targetModel: string;
  type: GraphType;
  metadata?: GraphMetadata[GraphType];

export default Graph;
