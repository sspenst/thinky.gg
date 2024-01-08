import { GameId } from '@root/constants/GameId';
import getPngDataServer from '@root/helpers/getPngDataServer';

describe('helpers/getPngDataServer.ts', () => {
  test('test getPngDataServer', async () => {
    await getPngDataServer(GameId.PATHOLOGY, { data: '1' });
  }, 30000);
});
