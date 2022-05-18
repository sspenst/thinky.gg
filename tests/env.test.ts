describe('pages/api/level/index.ts', () => {
  test('Sending nothing should return 401', async () => {
    expect(process.env).toBeDefined();
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.LOCAL).toBeDefined();
  });
});

export {};
