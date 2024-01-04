import { GameId } from '@root/constants/GameId';
import { Games } from '@root/constants/Games';
import getPngDataServer from '@root/helpers/getPngDataServer';

describe('helpers/getPngDataServer.ts', () => {
  test('test getPngDataServer', async () => {
    await getPngDataServer(Games[GameId.PATHOLOGY], { data: '1' });
  }, 30000);
});
