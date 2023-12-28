import getPngDataServer from '@root/helpers/getPngDataServer';

describe('helpers/getPngDataServer.ts', () => {
  test('test getPngDataServer', async () => {
    await getPngDataServer({ data: '1' });
  }, 30000);
});
