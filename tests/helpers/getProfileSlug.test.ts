import getProfileSlug from '@root/helpers/getProfileSlug';
import User from '@root/models/db/user';

describe('getProfileSlug', () => {
  test('should return profile slug with lowercase username', () => {
    const user = { name: 'TestUser' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/testuser');
  });

  test('should handle already lowercase username', () => {
    const user = { name: 'testuser' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/testuser');
  });

  test('should handle mixed case username', () => {
    const user = { name: 'TestUserName' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/testusername');
  });

  test('should handle username with numbers', () => {
    const user = { name: 'User123' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/user123');
  });

  test('should handle username with special characters', () => {
    const user = { name: 'User_Name-123' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/user_name-123');
  });

  test('should handle single character username', () => {
    const user = { name: 'A' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/a');
  });

  test('should handle empty username', () => {
    const user = { name: '' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/');
  });

  test('should handle username with spaces', () => {
    const user = { name: 'Test User' } as User;
    const result = getProfileSlug(user);
    expect(result).toBe('/profile/test user');
  });
});

export {};