import TestId from '@root/constants/testId';
import { processDiscordMentions } from '@root/helpers/processDiscordMentions';
import dbConnect, { dbDisconnect } from '@root/lib/dbConnect';
import { AuthProvider } from '@root/models/db/userAuth';
import { UserAuthModel } from '@root/models/mongoose';
import { Types } from 'mongoose';

beforeAll(async () => {
  await dbConnect();
});

afterAll(async () => {
  await dbDisconnect();
});

afterEach(async () => {
  // Clean up test Discord connections
  await UserAuthModel.deleteMany({
    userId: { $in: [TestId.USER_B, TestId.USER_C] },
    provider: AuthProvider.DISCORD,
  });
});

describe('helpers/processDiscordMentions.ts', () => {
  beforeEach(async () => {
    const now = Date.now();

    // Set up test Discord connections for USER_B and USER_C
    await UserAuthModel.insertMany([
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER_B),
        provider: AuthProvider.DISCORD,
        providerId: 'discord123',
        providerUsername: 'test_user_b_discord',
        connectedAt: now,
        updatedAt: now,
      },
      {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(TestId.USER_C),
        provider: AuthProvider.DISCORD,
        providerId: 'discord456',
        providerUsername: 'test_user_c_discord',
        connectedAt: now,
        updatedAt: now,
      }
    ]);
  });

  test('Should return original content when no usernames provided', async () => {
    const content = 'Hello world!';
    const result = await processDiscordMentions(content, []);

    expect(result).toBe(content);
  });

  test('Should return original content when usernames array is empty', async () => {
    const content = 'Hello world!';
    const result = await processDiscordMentions(content, []);

    expect(result).toBe(content);
  });

  test('Should process Discord mentions for users with Discord connected', async () => {
    const content = 'Great job BBB and Curator! https://thinky.gg/curator/test';
    const result = await processDiscordMentions(content, ['BBB', 'Curator']);

    expect(result).toBe('Great job <@discord123> and <@discord456>! https://thinky.gg/curator/test');
  });

  test('Should only process mentions for users with Discord connected', async () => {
    const content = 'Hello BBB and test!'; // 'test' user has no Discord connected
    const result = await processDiscordMentions(content, ['BBB', 'test']);

    expect(result).toBe('Hello <@discord123> and [test](https://thinky.gg/profile/test)!');
  });

  test('Should handle usernames not found in database', async () => {
    const content = 'Hello nonexistent user!';
    const result = await processDiscordMentions(content, ['nonexistent']);

    expect(result).toBe(content);
  });

  test('Should handle multiple mentions of same user', async () => {
    const content = 'BBB is awesome, thanks BBB!';
    const result = await processDiscordMentions(content, ['BBB']);

    expect(result).toBe('<@discord123> is awesome, thanks <@discord123>!');
  });

  test('Should handle case sensitivity correctly', async () => {
    const content = 'Hello bbb!'; // lowercase
    const result = await processDiscordMentions(content, ['BBB']); // uppercase

    expect(result).toBe('Hello <@discord123>!');
  });

  test('Should handle partial matches correctly', async () => {
    const content = 'BBBCool is not the same as BBB';
    const result = await processDiscordMentions(content, ['BBB']);

    expect(result).toBe('BBBCool is not the same as <@discord123>');
  });

  test('Should link to Thinky profile for users without Discord', async () => {
    const content = 'Thanks test for the great level!';
    const result = await processDiscordMentions(content, ['test']);

    expect(result).toBe('Thanks [test](https://thinky.gg/profile/test) for the great level!');
  });

  test('Should handle mix of Discord and non-Discord users correctly', async () => {
    const content = 'Congratulations BBB and test and Curator!';
    const result = await processDiscordMentions(content, ['BBB', 'test', 'Curator']);

    expect(result).toBe('Congratulations <@discord123> and [test](https://thinky.gg/profile/test) and <@discord456>!');
  });

  test('Should handle multiple mentions of non-Discord user', async () => {
    const content = 'test made a level, thanks test!';
    const result = await processDiscordMentions(content, ['test']);

    expect(result).toBe('[test](https://thinky.gg/profile/test) made a level, thanks [test](https://thinky.gg/profile/test)!');
  });
});
