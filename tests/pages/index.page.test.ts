import TestId from '../../constants/testId';
import dbConnect, { dbDisconnect } from '../../lib/dbConnect';
import { getStaticProps } from '../../pages/index';

beforeAll(async () => {
  await dbConnect();
});
afterAll(async () => {
  await dbDisconnect();
});
//enableFetchMocks()

describe('pages/index page', () => {
  test('getStaticProps with no params', async () => {
    // Created from initialize db file

    const ret = await getStaticProps();

    expect(ret).toBeDefined();
    expect(ret.props).toBeDefined();
    expect(ret.props.levels).toHaveLength(2);
    expect(ret.props.levels[0]._id).toBe(TestId.LEVEL);
    expect(ret.props.reviews).toHaveLength(1);
    expect(ret.props.reviews[0]._id).toBe(TestId.REVIEW);
  }
  );
});
