import GraphType from '../../constants/graphType';
import Collection from './collection';
import User from './user';

interface Graph {
  createdAt: Date;
  updatedAt: Date;
  source: User;
  sourceModel: string;
  target: User | Collection;
  targetModel: string;
  type: GraphType;
  updatedAt: Date;
}

export default Graph;
