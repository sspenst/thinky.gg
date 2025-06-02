import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import { EmailLogModel, UserModel } from '@root/models/mongoose';
import { EmailState } from '@root/models/schemas/emailLogSchema';
import { Types } from 'mongoose';
import { sendEmailNotification } from '../../../../../pages/api/internal-jobs/worker/sendEmailNotification';

// Mock external dependencies
jest.mock('@root/helpers/getEmailBody', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('<html>Mock email body</html>'),
}));

jest.mock('@root/helpers/getMobileNotification', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    title: 'Test Notification',
    body: 'Test notification body',
    url: 'https://example.com/test',
  }),
}));

jest.mock('../../../../../pages/api/internal-jobs/email-digest', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  jest.restoreAllMocks();
  // Clean up test data
  await EmailLogModel.deleteMany({ userId: { $in: [TestId.USER, TestId.USER_B] } });
});

describe('sendEmailNotification', () => {
  const mockNotification: Notification = {
    _id: new Types.ObjectId(),
    userId: { _id: TestId.USER } as unknown as User,
    type: NotificationType.NEW_LEVEL,
    message: 'Test notification',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Notification;

  test('should return early in test mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });

    try {
      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email notification not sent [test]');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should send email when no previous email log exists', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email sent');

      // Verify sendMail was called
      const { sendMail } = await import('../../../../../pages/api/internal-jobs/email-digest');

      expect(sendMail).toHaveBeenCalledWith(
        DEFAULT_GAME_ID,
        expect.any(Types.ObjectId),
        'NEW_LEVEL',
        mockNotification.userId,
        'Test Notification',
        '<html>Mock email body</html>'
      );
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should not send email if last email was sent less than 24 hours ago and user has not logged in since', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      // Create a recent email log with all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL',
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: recentTime,
      });

      // Mock user with last_visited_at before the email was sent
      const userSpy = jest.spyOn(UserModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: TestId.USER,
          last_visited_at: Math.floor(recentTime.getTime() / 1000) - 3600, // 1 hour before email
        }),
      } as any);

      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email not sent [lastLoggedInTime < lastSentTime]');
      expect(userSpy).toHaveBeenCalledWith(
        { _id: mockNotification.userId },
        { last_visited_at: 1 }
      );
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should send email if last email was sent less than 24 hours ago but user has logged in since', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      // Create a recent email log with all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL',
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: recentTime,
      });

      // Mock user with last_visited_at after the email was sent
      const userSpy = jest.spyOn(UserModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: TestId.USER,
          last_visited_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (after email)
        }),
      } as any);

      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email sent');
      expect(userSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should send email if last email was sent more than 24 hours ago', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      // Create an old email log with all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL',
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: oldTime,
      });

      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email sent');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should handle user with no last_visited_at', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      // Create a recent email log with all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL',
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: recentTime,
      });

      // Mock user with no last_visited_at
      const userSpy = jest.spyOn(UserModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: TestId.USER,
          last_visited_at: undefined,
        }),
      } as any);

      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email not sent [lastLoggedInTime < lastSentTime]');
      expect(userSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should handle missing user query result', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const recentTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      // Create a recent email log with all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL',
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: recentTime,
      });

      // Mock user query returning null
      const userSpy = jest.spyOn(UserModel, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('email not sent [lastLoggedInTime < lastSentTime]');
      expect(userSpy).toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should call helper functions with correct parameters', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      await sendEmailNotification(DEFAULT_GAME_ID, mockNotification);

      const getMobileNotification = (await import('@root/helpers/getMobileNotification')).default;
      const getEmailBody = (await import('@root/helpers/getEmailBody')).default;

      expect(getMobileNotification).toHaveBeenCalledWith(DEFAULT_GAME_ID, mockNotification);
      expect(getEmailBody).toHaveBeenCalledWith({
        gameId: DEFAULT_GAME_ID,
        linkHref: 'https://example.com/test',
        linkText: 'View',
        message: 'Test notification body',
        title: 'Test Notification',
        user: mockNotification.userId,
      });
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should use correct notification type for email log query', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    try {
      const differentTypeNotification = {
        ...mockNotification,
        type: NotificationType.NEW_FOLLOWER,
      };

      // Create email log with different type and all required fields
      await EmailLogModel.create({
        batchId: new Types.ObjectId(),
        userId: TestId.USER,
        type: 'NEW_LEVEL', // Different type
        gameId: DEFAULT_GAME_ID,
        subject: 'Test Email Subject',
        state: EmailState.SENT,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      });

      const result = await sendEmailNotification(DEFAULT_GAME_ID, differentTypeNotification);

      // Should send email because no log exists for NEW_FOLLOWER type
      expect(result).toBe('email sent');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });
});
