import { isDemoProLevel, isDemoProProfile, hasProAccessForLevel, hasProAccessForProfile } from '@root/helpers/isDemoProAccess';
import { EnrichedLevel } from '@root/models/db/level';
import User from '@root/models/db/user';
import Role from '@root/constants/role';
import { Types } from 'mongoose';

describe('isDemoProAccess helper functions', () => {
  describe('isDemoProLevel', () => {
    test('should return true for k2xl/touchtown level', () => {
      const demoLevel = {
        userId: { name: 'k2xl' },
        slug: 'touchtown',
      } as EnrichedLevel;

      expect(isDemoProLevel(demoLevel)).toBe(true);
    });

    test('should return false for regular levels', () => {
      const regularLevel = {
        userId: { name: 'someuser' },
        slug: 'somelevel',
      } as EnrichedLevel;

      expect(isDemoProLevel(regularLevel)).toBe(false);
    });

    test('should return false for k2xl user with different slug', () => {
      const wrongSlugLevel = {
        userId: { name: 'k2xl' },
        slug: 'different-level',
      } as EnrichedLevel;

      expect(isDemoProLevel(wrongSlugLevel)).toBe(false);
    });

    test('should return false for touchtown slug with different user', () => {
      const wrongUserLevel = {
        userId: { name: 'different-user' },
        slug: 'touchtown',
      } as EnrichedLevel;

      expect(isDemoProLevel(wrongUserLevel)).toBe(false);
    });

    test('should return false for null level', () => {
      expect(isDemoProLevel(null)).toBe(false);
    });
  });

  describe('isDemoProProfile', () => {
    test('should return true for k2xl user', () => {
      const demoUser = {
        name: 'k2xl',
      } as User;

      expect(isDemoProProfile(demoUser)).toBe(true);
    });

    test('should return false for other users', () => {
      const regularUser = {
        name: 'regularuser',
      } as User;

      expect(isDemoProProfile(regularUser)).toBe(false);
    });

    test('should return false for null user', () => {
      expect(isDemoProProfile(null)).toBe(false);
    });
  });

  describe('hasProAccessForLevel', () => {
    const proUser = {
      _id: new Types.ObjectId(),
      name: 'prouser',
      roles: [Role.PRO],
    } as User;

    const adminUser = {
      _id: new Types.ObjectId(),
      name: 'adminuser',
      roles: [Role.ADMIN],
    } as User;

    const regularUser = {
      _id: new Types.ObjectId(),
      name: 'regularuser',
      roles: [],
    } as User;

    const demoLevel = {
      userId: { name: 'k2xl' },
      slug: 'touchtown',
    } as EnrichedLevel;

    const regularLevel = {
      userId: { name: 'someuser' },
      slug: 'somelevel',
    } as EnrichedLevel;

    test('should return true for Pro user on any level', () => {
      expect(hasProAccessForLevel(proUser, regularLevel)).toBe(true);
      expect(hasProAccessForLevel(proUser, demoLevel)).toBe(true);
    });

    test('should return true for Admin user on any level', () => {
      expect(hasProAccessForLevel(adminUser, regularLevel)).toBe(true);
      expect(hasProAccessForLevel(adminUser, demoLevel)).toBe(true);
    });

    test('should return true for regular user on demo level', () => {
      expect(hasProAccessForLevel(regularUser, demoLevel)).toBe(true);
    });

    test('should return false for regular user on regular level', () => {
      expect(hasProAccessForLevel(regularUser, regularLevel)).toBe(false);
    });

    test('should return false for null user on regular level', () => {
      expect(hasProAccessForLevel(null, regularLevel)).toBe(false);
    });

    test('should return true for null user on demo level', () => {
      expect(hasProAccessForLevel(null, demoLevel)).toBe(true);
    });
  });

  describe('hasProAccessForProfile', () => {
    const proUser = {
      _id: new Types.ObjectId(),
      name: 'prouser',
      roles: [Role.PRO],
    } as User;

    const adminUser = {
      _id: new Types.ObjectId(),
      name: 'adminuser',
      roles: [Role.ADMIN],
    } as User;

    const regularUser = {
      _id: new Types.ObjectId(),
      name: 'regularuser',
      roles: [],
    } as User;

    const demoProfileUser = {
      name: 'k2xl',
    } as User;

    const regularProfileUser = {
      name: 'someuser',
    } as User;

    test('should return true for Pro user viewing any profile', () => {
      expect(hasProAccessForProfile(proUser, regularProfileUser)).toBe(true);
      expect(hasProAccessForProfile(proUser, demoProfileUser)).toBe(true);
    });

    test('should return true for Admin user viewing any profile', () => {
      expect(hasProAccessForProfile(adminUser, regularProfileUser)).toBe(true);
      expect(hasProAccessForProfile(adminUser, demoProfileUser)).toBe(true);
    });

    test('should return true for regular user viewing demo profile', () => {
      expect(hasProAccessForProfile(regularUser, demoProfileUser)).toBe(true);
    });

    test('should return false for regular user viewing regular profile', () => {
      expect(hasProAccessForProfile(regularUser, regularProfileUser)).toBe(false);
    });

    test('should return false for null user viewing regular profile', () => {
      expect(hasProAccessForProfile(null, regularProfileUser)).toBe(false);
    });

    test('should return true for null user viewing demo profile', () => {
      expect(hasProAccessForProfile(null, demoProfileUser)).toBe(true);
    });
  });

  describe('integration with user.config', () => {
    test('should handle users with config.roles', () => {
      const userWithConfigRoles = {
        _id: new Types.ObjectId(),
        name: 'configuser',
        roles: [],
        config: {
          roles: [Role.PRO],
        },
      } as User;

      const regularLevel = {
        userId: { name: 'someuser' },
        slug: 'somelevel',
      } as EnrichedLevel;

      expect(hasProAccessForLevel(userWithConfigRoles, regularLevel)).toBe(true);
    });
  });
});