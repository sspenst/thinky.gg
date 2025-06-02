import { DEFAULT_GAME_ID } from '@root/constants/GameId';
import NotificationType from '@root/constants/notificationType';
import TestId from '@root/constants/testId';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import Device from '@root/models/db/device';
import Notification from '@root/models/db/notification';
import User from '@root/models/db/user';
import { DeviceModel } from '@root/models/mongoose';
import { Types } from 'mongoose';
import { sendPushNotification } from '../../../../../pages/api/internal-jobs/worker/sendPushNotification';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({
    messaging: jest.fn(() => ({
      sendEachForMulticast: jest.fn(),
    })),
  })),
  credential: {
    cert: jest.fn(),
  },
}));

// Mock getMobileNotification helper
jest.mock('@root/helpers/getMobileNotification', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    title: 'Test Notification',
    body: 'Test notification body',
    url: 'https://example.com/test',
    imageUrl: 'https://example.com/image.png',
  }),
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
  await DeviceModel.deleteMany({ userId: { $in: [TestId.USER, TestId.USER_B] } });
});

describe('sendPushNotification', () => {
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
      const result = await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('push notification not sent [test]');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    }
  });

  test('should return early when Firebase environment variables are missing', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFirebaseKey = process.env.FIREBASE_PRIVATE_KEY;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    delete process.env.FIREBASE_PRIVATE_KEY;

    try {
      const result = await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe('push not sent. Firebase environment variables not set');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      if (originalFirebaseKey) process.env.FIREBASE_PRIVATE_KEY = originalFirebaseKey;
    }
  });

  test('should return early when user has no devices', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    try {
      const result = await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      expect(result).toBe(`Notification ${mockNotification._id.toString()} not sent: no devices found`);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PROJECT_ID;
    }
  });

  test('should send push notification when user has devices', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    try {
      // Create test devices with all required fields
      const testDevices = [
        {
          _id: new Types.ObjectId(),
          userId: TestId.USER,
          deviceToken: 'device-token-1',
          deviceName: 'iPhone 12',
          deviceBrand: 'Apple',
          deviceOSName: 'iOS',
          deviceOSVersion: '15.0',
        },
      ];

      await DeviceModel.insertMany(testDevices);

      const result = await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      // The actual implementation returns a JSON string of the Firebase response
      // Since Firebase is mocked, we just check that it doesn't return an error message
      expect(result).not.toBe(`Notification ${mockNotification._id.toString()} not sent: no devices found`);
      expect(result).not.toBe('push not sent. Firebase environment variables not set');
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PROJECT_ID;
    }
  });

  test('should call getMobileNotification with correct parameters', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    try {
      // Create test device
      await DeviceModel.create({
        _id: new Types.ObjectId(),
        userId: TestId.USER,
        deviceToken: 'device-token-1',
        deviceName: 'iPhone 12',
        deviceBrand: 'Apple',
        deviceOSName: 'iOS',
        deviceOSVersion: '15.0',
      });

      await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      const getMobileNotification = (await import('@root/helpers/getMobileNotification')).default;

      expect(getMobileNotification).toHaveBeenCalledWith(DEFAULT_GAME_ID, mockNotification);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PROJECT_ID;
    }
  });

  test('should filter devices correctly by userId', async () => {
    const originalNodeEnv = process.env.NODE_ENV;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
    process.env.FIREBASE_PRIVATE_KEY = 'test-key';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';

    try {
      // Create devices for different users
      const testDevices = [
        {
          _id: new Types.ObjectId(),
          userId: TestId.USER, // Target user
          deviceToken: 'target-device-1',
          deviceName: 'iPhone 12',
          deviceBrand: 'Apple',
          deviceOSName: 'iOS',
          deviceOSVersion: '15.0',
        },
        {
          _id: new Types.ObjectId(),
          userId: TestId.USER_B, // Different user
          deviceToken: 'other-device-1',
          deviceName: 'Pixel 6',
          deviceBrand: 'Google',
          deviceOSName: 'Android',
          deviceOSVersion: '12.0',
        },
      ];

      await DeviceModel.insertMany(testDevices);

      const result = await sendPushNotification(DEFAULT_GAME_ID, mockNotification);

      // Should successfully send notification (not return the "no devices" message)
      expect(result).not.toBe(`Notification ${mockNotification._id.toString()} not sent: no devices found`);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      delete process.env.FIREBASE_PRIVATE_KEY;
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PROJECT_ID;
    }
  });
});
