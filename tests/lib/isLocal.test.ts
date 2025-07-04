import isLocal from '@root/lib/isLocal';

describe('isLocal', () => {
  const originalEnv = process.env.LOCAL;

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.LOCAL = originalEnv;
    } else {
      delete process.env.LOCAL;
    }
  });

  test('should return true when LOCAL env is "true"', () => {
    process.env.LOCAL = 'true';
    expect(isLocal()).toBe(true);
  });

  test('should return false when LOCAL env is "false"', () => {
    process.env.LOCAL = 'false';
    expect(isLocal()).toBe(false);
  });

  test('should return false when LOCAL env is undefined', () => {
    delete process.env.LOCAL;
    expect(isLocal()).toBe(false);
  });

  test('should return false when LOCAL env is empty string', () => {
    process.env.LOCAL = '';
    expect(isLocal()).toBe(false);
  });

  test('should return false when LOCAL env is any other value', () => {
    process.env.LOCAL = 'yes';
    expect(isLocal()).toBe(false);
  });
});

export {};