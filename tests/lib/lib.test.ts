import { ObjectId } from 'bson';
import Role from '../../constants/role';
import cleanUser from '../../lib/cleanUser';
import getCollectionUserIds from '../../lib/getCollectionUserIds';
import User from '../../models/db/user';

describe('lib/*.ts', () => {
  test('cleanUser hideStatus false', async () => {
    const user = {
      hideStatus: false,
      last_visited_at: 1,
    } as User;

    cleanUser(user);
    expect(user.last_visited_at).toBe(1);
  });
  test('cleanUser hideStatus true', async () => {
    const user = {
      hideStatus: true,
      last_visited_at: 1,
    } as User;

    cleanUser(user);
    expect(user.last_visited_at).toBeUndefined();
  });
  test('getCollectionUserIds', async () => {
    const user = {
      _id: new ObjectId(),
    } as User;

    expect(getCollectionUserIds(user)).toHaveLength(1);

    user.roles = [Role.CURATOR];
    expect(getCollectionUserIds(user)).toHaveLength(2);
  });
});

export {};
