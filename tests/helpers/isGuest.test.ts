import isGuest from '@root/helpers/isGuest';
import Role from '@root/constants/role';
import User, { ReqUser } from '@root/models/db/user';

describe('isGuest', () => {
  test('should return true when user has GUEST role', () => {
    const user = { roles: [Role.GUEST] } as User;
    expect(isGuest(user)).toBe(true);
  });

  test('should return true when user has GUEST role among other roles', () => {
    const user = { roles: [Role.ADMIN, Role.GUEST, Role.PRO] } as User;
    expect(isGuest(user)).toBe(true);
  });

  test('should return false when user does not have GUEST role', () => {
    const user = { roles: [Role.ADMIN, Role.PRO] } as User;
    expect(isGuest(user)).toBe(false);
  });

  test('should return false when user has empty roles array', () => {
    const user = { roles: [] } as unknown as User;
    expect(isGuest(user)).toBe(false);
  });

  test('should return undefined when user has no roles property', () => {
    const user = {} as User;
    expect(isGuest(user)).toBeUndefined();
  });

  test('should return undefined when user is null', () => {
    expect(isGuest(null)).toBeUndefined();
  });

  test('should return undefined when user is undefined', () => {
    expect(isGuest(undefined)).toBeUndefined();
  });

  test('should work with ReqUser type', () => {
    const reqUser = { roles: [Role.GUEST] } as ReqUser;
    expect(isGuest(reqUser)).toBe(true);
  });

  test('should handle user with undefined roles', () => {
    const user = { roles: undefined } as unknown as User;
    expect(isGuest(user)).toBeUndefined();
  });
});

export {};