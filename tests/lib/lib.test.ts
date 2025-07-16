import cleanUser from '../../lib/cleanUser';
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
});

export { };
