import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { UserModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '../../../pages/[subdomain]/confirm-email/[userId]';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pages/[subdomain]/confirm-email/[userId]', () => {
  describe('getServerSideProps', () => {
    test('HAPPY PATH: Complete email confirmation flow', async () => {
      // Simulate the complete happy path flow
      const confirmationToken = 'user-receives-this-token-in-email';
      const testUserId = new Types.ObjectId();

      // 1. User signs up and gets an unconfirmed account with confirmation token
      const newUser = await UserModel.create({
        _id: testUserId,
        name: 'happypath_user',
        email: 'happy@example.com',
        password: 'password123',
        emailConfirmationToken: confirmationToken,
        emailConfirmed: false, // User starts unconfirmed
        ts: Date.now(),
      });

      try {
        // 2. User clicks the confirmation link in their email
        const context = {
          query: {
            token: confirmationToken,
            userId: testUserId.toString(),
          },
        };

        // 3. The confirmation page processes the request
        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        // 4. Verify the response indicates success
        expect(result).toEqual({
          props: {
            emailConfirmed: true,
          },
        });

        // 5. Verify the user's account is now confirmed in the database
        const confirmedUser = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken email');

        expect(confirmedUser?.emailConfirmed).toBe(true);
        expect(confirmedUser?.emailConfirmationToken).toBeNull(); // Token consumed
        expect(confirmedUser?.email).toBe('happy@example.com');

        // 6. Verify subsequent confirmation attempts don't break anything
        const secondAttempt = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(secondAttempt.props.emailConfirmed).toBe(false); // No user matches the criteria anymore
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });

    test('getServerSideProps with valid token and userId should confirm email', async () => {
      const testToken = 'test-confirmation-token-123';
      const testUserId = new Types.ObjectId();

      // Create a test user with email confirmation token
      await UserModel.create({
        _id: testUserId,
        name: 'testuser123',
        email: 'test@example.com',
        password: 'password123',
        emailConfirmationToken: testToken,
        emailConfirmed: false,
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: testToken,
            userId: testUserId.toString(),
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: true,
          },
        });

        // Verify the user was updated in the database
        const updatedUser = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken');

        expect(updatedUser?.emailConfirmed).toBe(true);
        expect(updatedUser?.emailConfirmationToken).toBeNull();
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });

    test('getServerSideProps with invalid token should not confirm email', async () => {
      const validToken = 'valid-token-123';
      const invalidToken = 'invalid-token-456';
      const testUserId = new Types.ObjectId();

      // Create a test user with a different email confirmation token
      await UserModel.create({
        _id: testUserId,
        name: 'testuser456',
        email: 'test2@example.com',
        password: 'password123',
        emailConfirmationToken: validToken,
        emailConfirmed: false,
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: invalidToken,
            userId: testUserId.toString(),
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: false,
          },
        });

        // Verify the user was NOT updated in the database
        const user = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken');

        expect(user?.emailConfirmed).toBe(false);
        expect(user?.emailConfirmationToken).toBe(validToken);
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });

    test('getServerSideProps with invalid userId should not confirm email', async () => {
      const testToken = 'test-token-123';
      const validUserId = new Types.ObjectId();
      const invalidUserId = new Types.ObjectId();

      // Create a test user
      await UserModel.create({
        _id: validUserId,
        name: 'testuser789',
        email: 'test3@example.com',
        password: 'password123',
        emailConfirmationToken: testToken,
        emailConfirmed: false,
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: testToken,
            userId: invalidUserId.toString(), // Different user ID
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: false,
          },
        });

        // Verify the user was NOT updated
        const user = await UserModel.findById(validUserId).select('emailConfirmed emailConfirmationToken');

        expect(user?.emailConfirmed).toBe(false);
        expect(user?.emailConfirmationToken).toBe(testToken);
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(validUserId);
      }
    });

    test('getServerSideProps with missing token should not confirm email', async () => {
      const context = {
        query: {
          userId: TestId.USER,
          // Missing token
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // After the bug fix, missing token properly returns false
      expect(result).toEqual({
        props: {
          emailConfirmed: false,
        },
      });
    });

    test('getServerSideProps with missing userId should not confirm email', async () => {
      const context = {
        query: {
          token: 'some-token',
          // Missing userId
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // The implementation tries to match with _id: undefined, which should not find any user
      expect(result).toEqual({
        props: {
          emailConfirmed: false,
        },
      });
    });

    test('getServerSideProps with empty query should not confirm email', async () => {
      const context = {
        query: {},
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // Both token and userId are undefined, so emailConfirmationToken: null and _id: undefined
      expect(result).toEqual({
        props: {
          emailConfirmed: false,
        },
      });
    });

    test('getServerSideProps should handle URL-encoded token', async () => {
      const originalToken = 'test token with spaces+special&chars';
      const encodedToken = encodeURIComponent(originalToken);
      const testUserId = new Types.ObjectId();

      // Create a test user with the original (unencoded) token
      await UserModel.create({
        _id: testUserId,
        name: 'testuser_encoded',
        email: 'test4@example.com',
        password: 'password123',
        emailConfirmationToken: originalToken,
        emailConfirmed: false,
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: encodedToken,
            userId: testUserId.toString(),
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: true,
          },
        });

        // Verify the user was updated
        const updatedUser = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken');

        expect(updatedUser?.emailConfirmed).toBe(true);
        expect(updatedUser?.emailConfirmationToken).toBeNull();
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });

    test('getServerSideProps should handle user that is already confirmed', async () => {
      const testToken = 'test-token-123';
      const testUserId = new Types.ObjectId();

      // Create a test user that is already confirmed
      await UserModel.create({
        _id: testUserId,
        name: 'testuser_confirmed',
        email: 'test5@example.com',
        password: 'password123',
        emailConfirmationToken: testToken,
        emailConfirmed: true, // Already confirmed
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: testToken,
            userId: testUserId.toString(),
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: true,
          },
        });

        // Verify the user's token was still cleared
        const updatedUser = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken');

        expect(updatedUser?.emailConfirmed).toBe(true);
        expect(updatedUser?.emailConfirmationToken).toBeNull();
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });

    test('getServerSideProps should handle non-existent user', async () => {
      const nonExistentUserId = new Types.ObjectId();

      const context = {
        query: {
          token: 'some-token',
          userId: nonExistentUserId.toString(),
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      expect(result).toEqual({
        props: {
          emailConfirmed: false,
        },
      });
    });

    test('getServerSideProps should handle array token parameter', async () => {
      const context = {
        query: {
          token: ['token1', 'token2'], // Array instead of string
          userId: TestId.USER,
        },
      };

      const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

      // After the bug fix, array token properly returns false (no database query attempted)
      expect(result).toEqual({
        props: {
          emailConfirmed: false,
        },
      });
    });

    test('getServerSideProps should handle database errors gracefully', async () => {
      // Mock UserModel.findOneAndUpdate to throw an error
      const findOneAndUpdateSpy = jest.spyOn(UserModel, 'findOneAndUpdate').mockImplementation(() => {
        throw new Error('Database connection error');
      });

      try {
        const context = {
          query: {
            token: 'test-token',
            userId: TestId.USER,
          },
        };

        // The implementation doesn't catch errors, so this should throw
        await expect(getServerSideProps(context as unknown as GetServerSidePropsContext)).rejects.toThrow('Database connection error');
      } finally {
        findOneAndUpdateSpy.mockRestore();
      }
    });

    test('getServerSideProps should handle null token properly', async () => {
      const testUserId = new Types.ObjectId();

      // Create a user with null email confirmation token
      await UserModel.create({
        _id: testUserId,
        name: 'testuser_null',
        email: 'test6@example.com',
        password: 'password123',
        emailConfirmationToken: null,
        emailConfirmed: false,
        ts: Date.now(),
      });

      try {
        const context = {
          query: {
            token: 'some-token',
            userId: testUserId.toString(),
          },
        };

        const result = await getServerSideProps(context as unknown as GetServerSidePropsContext);

        expect(result).toEqual({
          props: {
            emailConfirmed: false,
          },
        });

        // Verify the user was not updated since the token doesn't match
        const user = await UserModel.findById(testUserId).select('emailConfirmed emailConfirmationToken');

        expect(user?.emailConfirmed).toBe(false);
      } finally {
        // Clean up
        await UserModel.findByIdAndDelete(testUserId);
      }
    });
  });
});
