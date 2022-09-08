import Collection from './collection';
import User from './user';

interface Graph {
    source: User;
    sourceModel: string,
    type: string,
    target: User | Collection;
    targetModel: string;
}

export default Graph;
