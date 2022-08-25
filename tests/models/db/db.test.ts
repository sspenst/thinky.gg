import { ObjectId } from 'bson';
import Collection from '../../../models/db/collection';

describe('models/db/collection.ts', () => {
  test('Collection test', async () => {
    const collection = {
      _id: new ObjectId(),
    } as Collection;

    expect(collection._id).toBeDefined();
  });
});

export {};
